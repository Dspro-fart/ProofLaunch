use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{PlatformConfig, Meme, MemeStatus, BondingCurve, CurveStatus, GenesisPool};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct FinalizeProving<'info> {
    #[account(mut)]
    pub finalizer: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [MEME_SEED, &meme.index.to_le_bytes()],
        bump = meme.bump,
        constraint = meme.status == MemeStatus::Proving @ ProofOfMemeError::AlreadyLaunched
    )]
    pub meme: Account<'info, Meme>,

    /// The vault holding backing SOL
    #[account(
        mut,
        seeds = [VAULT_SEED, meme.key().as_ref()],
        bump = meme.vault_bump
    )]
    /// CHECK: PDA vault
    pub vault: SystemAccount<'info>,

    /// Token mint - created on successful launch
    #[account(
        init,
        payer = finalizer,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = curve,
        seeds = [b"mint", meme.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    /// Bonding curve account - created on successful launch
    #[account(
        init,
        payer = finalizer,
        space = BondingCurve::SIZE,
        seeds = [CURVE_SEED, meme.key().as_ref()],
        bump
    )]
    pub curve: Account<'info, BondingCurve>,

    /// Curve's token account to hold tokens for sale
    #[account(
        init,
        payer = finalizer,
        associated_token::mint = mint,
        associated_token::authority = curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

    /// Genesis pool for fee tracking
    #[account(
        init,
        payer = finalizer,
        space = GenesisPool::SIZE,
        seeds = [GENESIS_POOL_SEED, meme.key().as_ref()],
        bump
    )]
    pub genesis_pool: Account<'info, GenesisPool>,

    /// Curve's SOL vault
    #[account(
        mut,
        seeds = [b"curve_vault", meme.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for curve
    pub curve_vault: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn finalize_proving(ctx: Context<FinalizeProving>) -> Result<()> {
    let clock = Clock::get()?;
    let meme = &mut ctx.accounts.meme;
    let platform = &mut ctx.accounts.platform;

    // Check if proving period has ended
    require!(clock.unix_timestamp >= meme.proving_ends_at, ProofOfMemeError::ProvingStillActive);

    // Check if goal was reached
    let goal_reached = meme.sol_backed >= meme.sol_goal && meme.backer_count >= meme.min_backers;

    require!(goal_reached, ProofOfMemeError::GoalNotReached);

    // LAUNCH THE TOKEN
    msg!("Goal reached! Launching {}...", meme.get_name());

    let curve = &mut ctx.accounts.curve;
    let genesis_pool = &mut ctx.accounts.genesis_pool;

    // Set up mint reference
    meme.mint = ctx.accounts.mint.key();
    meme.status = MemeStatus::Launched;
    meme.launched_at = clock.unix_timestamp;

    // Calculate token distribution
    // 20% to genesis backers, 80% to bonding curve
    let genesis_tokens = TOTAL_SUPPLY
        .checked_mul(GENESIS_ALLOCATION_BPS)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    let curve_tokens = TOTAL_SUPPLY.checked_sub(genesis_tokens)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Initialize bonding curve
    curve.meme = meme.key();
    curve.mint = ctx.accounts.mint.key();
    // Virtual reserves set up for pump.fun-style curve
    // Starting at low price, increasing as tokens are bought
    curve.virtual_sol_reserves = 30_000_000_000; // 30 SOL virtual
    curve.virtual_token_reserves = curve_tokens;
    curve.real_sol_reserves = 0;
    curve.real_token_reserves = curve_tokens;
    curve.tokens_sold = 0;
    curve.total_volume = 0;
    curve.genesis_fees_accumulated = 0;
    curve.genesis_fees_distributed = 0;
    curve.platform_fees_accumulated = 0;
    curve.burn_fees_accumulated = 0;
    curve.status = CurveStatus::Active;
    curve.completion_threshold = CURVE_COMPLETION_SOL;
    curve.bump = ctx.bumps.curve;
    curve.vault_bump = ctx.bumps.curve_vault;

    // Initialize genesis pool
    genesis_pool.meme = meme.key();
    genesis_pool.total_qualified_backing = meme.sol_backed;
    genesis_pool.total_fees = 0;
    genesis_pool.total_claimed = 0;
    genesis_pool.qualified_backer_count = meme.backer_count;
    genesis_pool.bump = ctx.bumps.genesis_pool;

    // Mint tokens to curve's token account
    let meme_key = meme.key();
    let curve_seeds = &[
        CURVE_SEED,
        meme_key.as_ref(),
        &[curve.bump],
    ];
    let signer_seeds = &[&curve_seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.curve_token_account.to_account_info(),
                authority: curve.to_account_info(),
            },
            signer_seeds,
        ),
        curve_tokens,
    )?;

    // Update platform stats
    platform.total_memes_launched = platform.total_memes_launched.checked_add(1)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    msg!("Token launched! {} tokens in curve, {} reserved for genesis backers",
        curve_tokens, genesis_tokens);

    Ok(())
}

// Separate instruction for marking failed memes
#[derive(Accounts)]
pub struct MarkMemeFailed<'info> {
    pub finalizer: Signer<'info>,

    #[account(
        mut,
        seeds = [MEME_SEED, &meme.index.to_le_bytes()],
        bump = meme.bump,
        constraint = meme.status == MemeStatus::Proving @ ProofOfMemeError::AlreadyLaunched
    )]
    pub meme: Account<'info, Meme>,
}

pub fn mark_meme_failed(ctx: Context<MarkMemeFailed>) -> Result<()> {
    let clock = Clock::get()?;
    let meme = &mut ctx.accounts.meme;

    // Check if proving period has ended
    require!(clock.unix_timestamp >= meme.proving_ends_at, ProofOfMemeError::ProvingStillActive);

    // Check if goal was NOT reached
    let goal_reached = meme.sol_backed >= meme.sol_goal && meme.backer_count >= meme.min_backers;
    require!(!goal_reached, ProofOfMemeError::GoalNotReached);

    msg!("Goal not reached. Marking as failed - backers can withdraw.");
    meme.status = MemeStatus::Failed;

    Ok(())
}
