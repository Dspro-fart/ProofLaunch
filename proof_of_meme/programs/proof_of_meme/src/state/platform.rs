use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct PlatformConfig {
    /// Platform authority (admin)
    pub authority: Pubkey,
    /// Fee to submit a meme (anti-spam)
    pub submission_fee: u64,
    /// Platform's share of trading fees (basis points)
    pub platform_fee_bps: u16,
    /// Genesis backers' share of trading fees (basis points)
    pub genesis_fee_bps: u16,
    /// Burn share of trading fees (basis points)
    pub burn_fee_bps: u16,
    /// Total memes submitted
    pub total_memes_submitted: u64,
    /// Total memes launched
    pub total_memes_launched: u64,
    /// Total SOL collected in fees
    pub total_platform_fees: u64,
    /// Bump seed
    pub bump: u8,
}

impl PlatformConfig {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        8 + // submission_fee
        2 + // platform_fee_bps
        2 + // genesis_fee_bps
        2 + // burn_fee_bps
        8 + // total_memes_submitted
        8 + // total_memes_launched
        8 + // total_platform_fees
        1 + // bump
        64; // padding for future use
}
