use anchor_lang::prelude::*;
use crate::state::{PlatformConfig, Meme, MemeStatus, BondingCurve, CurveStatus};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct MigrateToRaydium<'info> {
    /// Anyone can trigger migration once curve is complete
    #[account(mut)]
    pub migrator: Signer<'info>,

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
        constraint = meme.status == MemeStatus::Launched @ ProofOfMemeError::CurveNotActive
    )]
    pub meme: Account<'info, Meme>,

    #[account(
        mut,
        seeds = [CURVE_SEED, meme.key().as_ref()],
        bump = curve.bump,
        constraint = curve.meme == meme.key() @ ProofOfMemeError::InvalidCurveAccount,
        constraint = curve.status == CurveStatus::Complete @ ProofOfMemeError::CurveNotComplete
    )]
    pub curve: Account<'info, BondingCurve>,

    /// Platform authority receives migration fee - MUST match platform config
    #[account(
        mut,
        constraint = platform_authority.key() == platform.authority @ ProofOfMemeError::InvalidPlatformAuthority
    )]
    /// CHECK: Validated against platform config
    pub platform_authority: SystemAccount<'info>,

    /// Curve's SOL vault
    #[account(
        mut,
        seeds = [b"curve_vault", meme.key().as_ref()],
        bump = curve.vault_bump
    )]
    /// CHECK: PDA vault validated by seeds
    pub curve_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn migrate_to_raydium(ctx: Context<MigrateToRaydium>) -> Result<()> {
    let meme = &mut ctx.accounts.meme;
    let curve = &mut ctx.accounts.curve;
    let platform = &mut ctx.accounts.platform;

    // Verify vault has enough for migration fee
    let vault_balance = ctx.accounts.curve_vault.lamports();
    require!(vault_balance >= MIGRATION_FEE, ProofOfMemeError::InsufficientVaultBalance);

    // Take migration fee from curve vault
    **ctx.accounts.curve_vault.try_borrow_mut_lamports()? = ctx.accounts.curve_vault
        .lamports()
        .checked_sub(MIGRATION_FEE)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    **ctx.accounts.platform_authority.try_borrow_mut_lamports()? = ctx.accounts.platform_authority
        .lamports()
        .checked_add(MIGRATION_FEE)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Update platform stats
    platform.total_platform_fees = platform.total_platform_fees
        .checked_add(MIGRATION_FEE)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Mark as migrated
    meme.status = MemeStatus::Migrated;
    curve.status = CurveStatus::Migrated;

    msg!("Migration initiated!");
    msg!("Migration fee: {} lamports", MIGRATION_FEE);
    msg!("Remaining SOL in curve vault: {} lamports", ctx.accounts.curve_vault.lamports());

    // NOTE: In production, this would include CPI to Raydium to:
    // 1. Create the AMM pool
    // 2. Transfer remaining tokens from curve to pool
    // 3. Transfer remaining SOL from curve vault to pool
    // 4. Burn or lock LP tokens
    //
    // For MVP, we mark as migrated and handle pool creation off-chain
    // The remaining SOL and tokens can be withdrawn by a separate admin instruction
    // or used in a follow-up transaction with Raydium CPI

    Ok(())
}
