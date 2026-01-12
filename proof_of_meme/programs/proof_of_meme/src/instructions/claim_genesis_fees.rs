use anchor_lang::prelude::*;
use crate::state::{Meme, MemeStatus, Backing, BondingCurve, GenesisPool};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct ClaimGenesisFees<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,

    #[account(
        seeds = [MEME_SEED, &meme.index.to_le_bytes()],
        bump = meme.bump,
        // Can claim while launched OR after migration (claim remaining)
        constraint = meme.status == MemeStatus::Launched || meme.status == MemeStatus::Migrated @ ProofOfMemeError::CurveNotActive
    )]
    pub meme: Account<'info, Meme>,

    #[account(
        mut,
        seeds = [BACKING_SEED, meme.key().as_ref(), backer.key().as_ref()],
        bump = backing.bump,
        constraint = backing.backer == backer.key() @ ProofOfMemeError::NotGenesisBacker,
        constraint = backing.qualifies_for_fees @ ProofOfMemeError::NotGenesisBacker,
        constraint = !backing.withdrawn @ ProofOfMemeError::BackingAlreadyWithdrawn
    )]
    pub backing: Account<'info, Backing>,

    #[account(
        mut,
        seeds = [CURVE_SEED, meme.key().as_ref()],
        bump = curve.bump,
        constraint = curve.meme == meme.key() @ ProofOfMemeError::InvalidCurveAccount
    )]
    pub curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        seeds = [GENESIS_POOL_SEED, meme.key().as_ref()],
        bump = genesis_pool.bump,
        constraint = genesis_pool.meme == meme.key() @ ProofOfMemeError::AccountMismatch
    )]
    pub genesis_pool: Account<'info, GenesisPool>,

    /// Curve's SOL vault (where genesis fees accumulate)
    #[account(
        mut,
        seeds = [b"curve_vault", meme.key().as_ref()],
        bump = curve.vault_bump
    )]
    /// CHECK: PDA vault validated by seeds
    pub curve_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn claim_genesis_fees(ctx: Context<ClaimGenesisFees>) -> Result<()> {
    let backing = &mut ctx.accounts.backing;
    let genesis_pool = &mut ctx.accounts.genesis_pool;
    let curve = &mut ctx.accounts.curve;

    // Calculate claimable amount based on backer's share
    let claimable = genesis_pool.calculate_claimable(backing.amount, backing.fees_claimed)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    require!(claimable > 0, ProofOfMemeError::NoFeesToClaim);

    // CRITICAL: Verify vault has enough balance
    let vault_balance = ctx.accounts.curve_vault.lamports();
    require!(claimable <= vault_balance, ProofOfMemeError::InsufficientVaultBalance);

    // Transfer fees from curve vault to backer
    **ctx.accounts.curve_vault.try_borrow_mut_lamports()? = ctx.accounts.curve_vault
        .lamports()
        .checked_sub(claimable)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    **ctx.accounts.backer.try_borrow_mut_lamports()? = ctx.accounts.backer
        .lamports()
        .checked_add(claimable)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Update tracking
    backing.fees_claimed = backing.fees_claimed
        .checked_add(claimable)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    genesis_pool.total_claimed = genesis_pool.total_claimed
        .checked_add(claimable)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    curve.genesis_fees_distributed = curve.genesis_fees_distributed
        .checked_add(claimable)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    msg!("Claimed {} lamports in genesis fees", claimable);
    msg!("Total fees claimed by this backer: {} lamports", backing.fees_claimed);

    Ok(())
}
