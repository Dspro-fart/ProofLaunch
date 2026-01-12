use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Backing {
    /// The backer's wallet
    pub backer: Pubkey,
    /// The meme being backed
    pub meme: Pubkey,
    /// Amount of SOL backed
    pub amount: u64,
    /// Whether this backing qualifies for genesis fee share (>= 0.5 SOL)
    pub qualifies_for_fees: bool,
    /// Timestamp of backing
    pub backed_at: i64,
    /// Whether backing has been withdrawn (refund)
    pub withdrawn: bool,
    /// Tokens received on launch
    pub tokens_received: u64,
    /// Total fees claimed so far
    pub fees_claimed: u64,
    /// Share of genesis pool (basis points, calculated at launch)
    pub genesis_share_bps: u64,
    /// Bump seed
    pub bump: u8,
}

impl Backing {
    pub const SIZE: usize = 8 + // discriminator
        32 + // backer
        32 + // meme
        8 + // amount
        1 + // qualifies_for_fees
        8 + // backed_at
        1 + // withdrawn
        8 + // tokens_received
        8 + // fees_claimed
        8 + // genesis_share_bps
        1 + // bump
        32; // padding
}
