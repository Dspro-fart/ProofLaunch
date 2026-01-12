use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PlatformConfig, Meme, MemeStatus};
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct SubmitMeme<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = creator,
        space = Meme::SIZE,
        seeds = [MEME_SEED, &platform.total_memes_submitted.to_le_bytes()],
        bump
    )]
    pub meme: Account<'info, Meme>,

    /// The vault that holds backing SOL - created as PDA
    #[account(
        mut,
        seeds = [VAULT_SEED, meme.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault validated by seeds
    pub vault: SystemAccount<'info>,

    /// Platform fee recipient - MUST match platform config
    #[account(
        mut,
        constraint = platform_authority.key() == platform.authority @ ProofOfMemeError::InvalidPlatformAuthority
    )]
    /// CHECK: Validated against platform config
    pub platform_authority: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn submit_meme(
    ctx: Context<SubmitMeme>,
    name: String,
    symbol: String,
    uri: String,
    description: String,
    sol_goal: u64,
    min_backers: u32,
    duration_seconds: i64,
) -> Result<()> {
    // Validate name is not empty
    require!(!name.is_empty(), ProofOfMemeError::EmptyName);
    require!(name.len() <= MAX_NAME_LENGTH, ProofOfMemeError::NameTooLong);

    // Validate symbol is not empty
    require!(!symbol.is_empty(), ProofOfMemeError::EmptySymbol);
    require!(symbol.len() <= MAX_SYMBOL_LENGTH, ProofOfMemeError::SymbolTooLong);

    // URI and description can be empty but not too long
    require!(uri.len() <= MAX_URI_LENGTH, ProofOfMemeError::UriTooLong);
    require!(description.len() <= MAX_DESCRIPTION_LENGTH, ProofOfMemeError::DescriptionTooLong);

    // Validate goals
    require!(sol_goal >= MIN_SOL_GOAL, ProofOfMemeError::GoalTooLow);
    require!(sol_goal <= MAX_SOL_GOAL, ProofOfMemeError::GoalTooHigh);
    require!(min_backers >= MIN_BACKERS, ProofOfMemeError::MinBackersTooLow);

    // Validate duration
    require!(duration_seconds >= MIN_PROVING_DURATION, ProofOfMemeError::DurationTooShort);
    require!(duration_seconds <= MAX_PROVING_DURATION, ProofOfMemeError::DurationTooLong);

    let platform = &mut ctx.accounts.platform;
    let meme = &mut ctx.accounts.meme;
    let clock = Clock::get()?;

    // Transfer submission fee to platform authority
    if platform.submission_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.platform_authority.to_account_info(),
                },
            ),
            platform.submission_fee,
        )?;
    }

    // Initialize meme
    meme.creator = ctx.accounts.creator.key();
    meme.mint = Pubkey::default(); // Will be set on launch
    meme.set_name(&name);
    meme.set_symbol(&symbol);
    meme.set_uri(&uri);
    meme.set_description(&description);
    meme.sol_goal = sol_goal;
    meme.sol_backed = 0;
    meme.min_backers = min_backers;
    meme.backer_count = 0;
    meme.proving_ends_at = clock.unix_timestamp
        .checked_add(duration_seconds)
        .ok_or(ProofOfMemeError::MathOverflow)?;
    meme.status = MemeStatus::Proving;
    meme.created_at = clock.unix_timestamp;
    meme.launched_at = 0;
    meme.creator_backing = 0;
    meme.index = platform.total_memes_submitted;
    meme.bump = ctx.bumps.meme;
    meme.vault_bump = ctx.bumps.vault;

    // Increment counter
    platform.total_memes_submitted = platform.total_memes_submitted
        .checked_add(1)
        .ok_or(ProofOfMemeError::MathOverflow)?;

    msg!("Meme submitted to Proving Grounds");
    msg!("Index: {}, Goal: {} SOL, Min backers: {}",
        meme.index,
        sol_goal / 1_000_000_000,
        min_backers);

    Ok(())
}
