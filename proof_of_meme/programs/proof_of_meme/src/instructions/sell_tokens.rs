use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{PlatformConfig, Meme, MemeStatus, BondingCurve, CurveStatus, GenesisPool};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

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

    /// Seller's token account
    #[account(
        mut,
        associated_token::mint = meme.mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

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

pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
    // Validate input amount
    require!(token_amount > 0, ProofOfMemeError::ZeroAmount);

    let curve = &mut ctx.accounts.curve;
    let genesis_pool = &mut ctx.accounts.genesis_pool;
    let platform = &ctx.accounts.platform;

    // Calculate SOL out before fees
    let sol_out_gross = curve.calculate_sell_sol(token_amount)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Validate sol_out is non-zero
    require!(sol_out_gross > 0, ProofOfMemeError::InvalidTokenAmount);

    // Calculate trading fee (1%)
    let trading_fee = sol_out_gross
        .checked_mul(TRADING_FEE_BPS)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    let sol_out_net = sol_out_gross.checked_sub(trading_fee)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Check slippage
    require!(sol_out_net >= min_sol_out, ProofOfMemeError::SlippageExceeded);

    // CRITICAL: Verify vault has sufficient balance before withdrawal
    let vault_balance = ctx.accounts.curve_vault.lamports();
    require!(sol_out_gross <= vault_balance, ProofOfMemeError::InsufficientVaultBalance);
    require!(sol_out_gross <= curve.real_sol_reserves, ProofOfMemeError::InsufficientSol);

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

    // Transfer tokens from seller to curve FIRST (receive before send pattern)
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.curve_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Calculate amounts to transfer
    // Genesis fee stays in vault for genesis backers to claim
    // Platform fee goes to platform authority
    // Burn fee is tracked but stays in vault (effectively reducing supply value)
    let sol_to_seller = sol_out_net;

    // Transfer SOL from curve vault to seller
    **ctx.accounts.curve_vault.try_borrow_mut_lamports()? = ctx.accounts.curve_vault
        .lamports()
        .checked_sub(sol_to_seller)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    **ctx.accounts.seller.try_borrow_mut_lamports()? = ctx.accounts.seller
        .lamports()
        .checked_add(sol_to_seller)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Transfer platform fee from vault
    if platform_fee > 0 {
        **ctx.accounts.curve_vault.try_borrow_mut_lamports()? = ctx.accounts.curve_vault
            .lamports()
            .checked_sub(platform_fee)
            .ok_or(ProofOfMemeError::MathOverflow)?;
        **ctx.accounts.platform_authority.try_borrow_mut_lamports()? = ctx.accounts.platform_authority
            .lamports()
            .checked_add(platform_fee)
            .ok_or(ProofOfMemeError::MathOverflow)?;
    }

    // Genesis fee stays in vault - will be claimed by genesis backers

    // Update curve state
    curve.apply_sell(token_amount, sol_out_gross);
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

    msg!("Sold {} tokens for {} lamports (fee: {} lamports)",
        token_amount, sol_out_net, trading_fee);

    Ok(())
}
