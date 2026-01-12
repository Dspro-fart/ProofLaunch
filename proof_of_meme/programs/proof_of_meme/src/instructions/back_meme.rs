use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Meme, MemeStatus, Backing};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct BackMeme<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,

    #[account(
        mut,
        seeds = [MEME_SEED, &meme.index.to_le_bytes()],
        bump = meme.bump,
        constraint = meme.status == MemeStatus::Proving @ ProofOfMemeError::AlreadyLaunched
    )]
    pub meme: Account<'info, Meme>,

    #[account(
        init_if_needed,
        payer = backer,
        space = Backing::SIZE,
        seeds = [BACKING_SEED, meme.key().as_ref(), backer.key().as_ref()],
        bump
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

pub fn back_meme(ctx: Context<BackMeme>, amount: u64) -> Result<()> {
    // Validate input
    require!(amount > 0, ProofOfMemeError::ZeroAmount);

    let meme = &mut ctx.accounts.meme;
    let backing = &mut ctx.accounts.backing;
    let clock = Clock::get()?;

    // Check proving period hasn't ended
    require!(clock.unix_timestamp < meme.proving_ends_at, ProofOfMemeError::ProvingEnded);

    // Check this isn't a new backing below minimum (allow top-ups to existing backings)
    let is_new_backer = backing.amount == 0;
    let new_total = backing.amount.checked_add(amount).ok_or(ProofOfMemeError::MathOverflow)?;

    // For new backings, enforce minimum for fee eligibility
    if is_new_backer {
        require!(amount >= MIN_BACKING_AMOUNT, ProofOfMemeError::BackingTooLow);
    }

    // Check max backing (10% of goal) - prevents whale dominance
    let max_backing = meme.sol_goal
        .checked_mul(MAX_BACKING_PERCENTAGE_BPS)
        .ok_or(ProofOfMemeError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    require!(new_total <= max_backing, ProofOfMemeError::BackingExceedsMaximum);

    // Transfer SOL to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.backer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update backing record
    if is_new_backer {
        backing.backer = ctx.accounts.backer.key();
        backing.meme = meme.key();
        backing.backed_at = clock.unix_timestamp;
        backing.withdrawn = false;
        backing.tokens_received = 0;
        backing.fees_claimed = 0;
        backing.genesis_share_bps = 0; // Calculated at launch
        backing.bump = ctx.bumps.backing;

        // Increment backer count
        meme.backer_count = meme.backer_count.checked_add(1)
            .ok_or(ProofOfMemeError::MathOverflow)?;
    }

    backing.amount = new_total;
    backing.qualifies_for_fees = new_total >= MIN_BACKING_AMOUNT;

    // Update meme totals
    meme.sol_backed = meme.sol_backed.checked_add(amount)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    // Track if creator is backing their own meme (transparency)
    if ctx.accounts.backer.key() == meme.creator {
        meme.creator_backing = new_total;
    }

    msg!("Backed meme with {} lamports (total backing: {})", amount, new_total);
    msg!("Progress: {}/{} SOL, {}/{} backers",
        meme.sol_backed / 1_000_000_000,
        meme.sol_goal / 1_000_000_000,
        meme.backer_count,
        meme.min_backers);

    Ok(())
}
