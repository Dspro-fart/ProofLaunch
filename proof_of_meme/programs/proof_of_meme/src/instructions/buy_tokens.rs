use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{PlatformConfig, Meme, MemeStatus, BondingCurve, CurveStatus, GenesisPool};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformConfig>,

    #[account(
        // Validate meme has correct seed derivation
        seeds = [MEME_SEED, &meme.index.to_le_bytes()],
        bump = meme.bump,
        constraint = meme.status == MemeStatus::Launched @ ProofOfMemeError::CurveNotActive
    )]
    pub meme: Account<'info, Meme>,

    #[account(
        mut,
        seeds = [CURVE_SEED, meme.key().as_ref()],
        bump = curve.bump,
        // Validate curve belongs to this meme
        constraint = curve.meme == meme.key() @ ProofOfMemeError::InvalidCurveAccount,
        constraint = curve.status == CurveStatus::Active @ ProofOfMemeError::CurveCompleted
    )]
    pub curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        seeds = [GENESIS_POOL_SEED, meme.key().as_ref()],
        bump = genesis_pool.bump,
        // Validate genesis pool belongs to this meme
        constraint = genesis_pool.meme == meme.key() @ ProofOfMemeError::AccountMismatch
    )]
    pub genesis_pool: Account<'info, GenesisPool>,

    /// Curve's token account
    #[account(
        mut,
        associated_token::mint = meme.mint,
        associated_token::authority = curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

    /// Buyer's token account
    #[account(
        mut,
        associated_token::mint = meme.mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// Curve's SOL vault
    #[account(
        mut,
        seeds = [b"curve_vault", meme.key().as_ref()],
        bump = curve.vault_bump
    )]
    /// CHECK: PDA vault validated by seeds
    pub curve_vault: SystemAccount<'info>,

    /// Platform fee recipient - MUST match platform config
    #[account(
        mut,
        constraint = platform_authority.key() == platform.authority @ ProofOfMemeError::InvalidPlatformAuthority
    )]
    /// CHECK: Validated against platform config
    pub platform_authority: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
    // Validate input amount
    require!(sol_amount > 0, ProofOfMemeError::ZeroAmount);

    let platform = &ctx.accounts.platform;

    // Calculate trading fee (1%)
    let trading_fee = sol_amount
        .checked_mul(TRADING_FEE_BPS)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    let sol_after_fee = sol_amount.checked_sub(trading_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Calculate tokens out (read-only access first)
    let tokens_out = ctx.accounts.curve.calculate_buy_tokens(sol_after_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Validate tokens_out is non-zero (prevents dust attacks)
    require!(tokens_out > 0, ProofOfMemeError::InvalidTokenAmount);

    // Check slippage
    require!(tokens_out >= min_tokens_out, ProofOfMemeError::SlippageExceeded);
    require!(tokens_out <= ctx.accounts.curve.real_token_reserves, ProofOfMemeError::InsufficientTokens);

    // Calculate fee distribution
    let genesis_fee = trading_fee
        .checked_mul(platform.genesis_fee_bps as u64)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    let platform_fee = trading_fee
        .checked_mul(platform.platform_fee_bps as u64)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    let burn_fee = trading_fee.checked_sub(genesis_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_sub(platform_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Transfer SOL from buyer to curve vault (minus platform fee)
    let sol_to_curve = sol_amount.checked_sub(platform_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.curve_vault.to_account_info(),
            },
        ),
        sol_to_curve,
    )?;

    // Transfer platform fee
    if platform_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.platform_authority.to_account_info(),
                },
            ),
            platform_fee,
        )?;
    }

    // Transfer tokens from curve to buyer
    // Extract values needed for signer seeds before mutable borrow
    let meme_key = ctx.accounts.meme.key();
    let curve_bump = ctx.accounts.curve.bump;
    let curve_seeds = &[
        CURVE_SEED,
        meme_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&curve_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.curve_token_account.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_out,
    )?;

    // Now take mutable references for state updates
    let curve = &mut ctx.accounts.curve;
    let genesis_pool = &mut ctx.accounts.genesis_pool;

    // Update curve state
    curve.apply_buy(sol_after_fee, tokens_out);
    curve.genesis_fees_accumulated = curve.genesis_fees_accumulated
        .checked_add(genesis_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    curve.platform_fees_accumulated = curve.platform_fees_accumulated
        .checked_add(platform_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    curve.burn_fees_accumulated = curve.burn_fees_accumulated
        .checked_add(burn_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Update genesis pool
    genesis_pool.total_fees = genesis_pool.total_fees
        .checked_add(genesis_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Check if curve is complete
    if curve.is_complete() {
        curve.status = CurveStatus::Complete;
        msg!("Bonding curve complete! Ready for Raydium migration.");
    }

    msg!("Bought {} tokens for {} lamports (fee: {} lamports)",
        tokens_out, sol_amount, trading_fee);

    Ok(())
}
