use anchor_lang::prelude::*;
use crate::state::{Meme, MemeStatus, Backing};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct WithdrawBacking<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,

    #[account(
        mut,
        seeds = [MEME_SEED, &meme.index.to_le_bytes()],
        bump = meme.bump,
        constraint = meme.status == MemeStatus::Failed @ ProofOfMemeError::ProvingStillActive
    )]
    pub meme: Account<'info, Meme>,

    #[account(
        mut,
        seeds = [BACKING_SEED, meme.key().as_ref(), backer.key().as_ref()],
        bump = backing.bump,
        constraint = backing.backer == backer.key() @ ProofOfMemeError::NoBackingFound,
        constraint = backing.meme == meme.key() @ ProofOfMemeError::AccountMismatch,
        constraint = !backing.withdrawn @ ProofOfMemeError::BackingAlreadyWithdrawn,
        constraint = backing.amount > 0 @ ProofOfMemeError::NoBackingFound
    )]
    pub backing: Account<'info, Backing>,

    /// The vault that holds backing SOL
    #[account(
        mut,
        seeds = [VAULT_SEED, meme.key().as_ref()],
        bump = meme.vault_bump
    )]
    /// CHECK: PDA vault validated by seeds
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn withdraw_backing(ctx: Context<WithdrawBacking>) -> Result<()> {
    let _meme = &ctx.accounts.meme;
    let backing = &mut ctx.accounts.backing;
    let amount = backing.amount;

    // CRITICAL: Verify vault has enough balance
    let vault_balance = ctx.accounts.vault.lamports();
    require!(amount <= vault_balance, ProofOfMemeError::InsufficientVaultBalance);

    // Transfer SOL back to backer from vault
    **ctx.accounts.vault.try_borrow_mut_lamports()? = ctx.accounts.vault
        .lamports()
        .checked_sub(amount)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    **ctx.accounts.backer.try_borrow_mut_lamports()? = ctx.accounts.backer
        .lamports()
        .checked_add(amount)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Mark as withdrawn
    backing.withdrawn = true;
    backing.amount = 0;

    msg!("Withdrew {} lamports for failed meme", amount);

    Ok(())
}
