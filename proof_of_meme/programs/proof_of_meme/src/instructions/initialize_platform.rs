use anchor_lang::prelude::*;
use crate::state::PlatformConfig;
use crate::constants::*;
use crate::errors::ProofOfMemeError;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PlatformConfig::SIZE,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    submission_fee: u64,
    platform_fee_bps: u16,
    genesis_fee_bps: u16,
    burn_fee_bps: u16,
) -> Result<()> {
    // Validate fee configuration (must sum to 10000 bps = 100%)
    let total_bps = platform_fee_bps as u32 + genesis_fee_bps as u32 + burn_fee_bps as u32;
    require!(total_bps == 10_000, ProofOfMemeError::InvalidFeeConfig);

    let platform = &mut ctx.accounts.platform;

    platform.authority = ctx.accounts.authority.key();
    platform.submission_fee = submission_fee;
    platform.platform_fee_bps = platform_fee_bps;
    platform.genesis_fee_bps = genesis_fee_bps;
    platform.burn_fee_bps = burn_fee_bps;
    platform.total_memes_submitted = 0;
    platform.total_memes_launched = 0;
    platform.total_platform_fees = 0;
    platform.bump = ctx.bumps.platform;

    msg!("Platform initialized with submission fee: {} lamports", submission_fee);
    msg!("Fee split - Platform: {}bps, Genesis: {}bps, Burn: {}bps",
        platform_fee_bps, genesis_fee_bps, burn_fee_bps);

    Ok(())
}
