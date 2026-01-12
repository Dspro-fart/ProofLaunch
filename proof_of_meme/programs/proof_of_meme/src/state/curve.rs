use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CurveStatus {
    /// Active trading
    Active,
    /// Curve filled, ready for migration
    Complete,
    /// Migrated to Raydium
    Migrated,
}

impl Default for CurveStatus {
    fn default() -> Self {
        CurveStatus::Active
    }
}

#[account]
pub struct BondingCurve {
    /// The meme this curve belongs to
    pub meme: Pubkey,
    /// Token mint
    pub mint: Pubkey,
    /// Virtual SOL reserves (for pricing)
    pub virtual_sol_reserves: u64,
    /// Virtual token reserves (for pricing)
    pub virtual_token_reserves: u64,
    /// Real SOL in the curve
    pub real_sol_reserves: u64,
    /// Real tokens available
    pub real_token_reserves: u64,
    /// Tokens sold so far
    pub tokens_sold: u64,
    /// Total trading volume (SOL)
    pub total_volume: u64,
    /// Accumulated fees for genesis backers
    pub genesis_fees_accumulated: u64,
    /// Fees already distributed to backers
    pub genesis_fees_distributed: u64,
    /// Accumulated fees for platform
    pub platform_fees_accumulated: u64,
    /// Accumulated fees for burn
    pub burn_fees_accumulated: u64,
    /// Curve status
    pub status: CurveStatus,
    /// SOL needed to complete curve
    pub completion_threshold: u64,
    /// Bump seed
    pub bump: u8,
    /// Vault bump
    pub vault_bump: u8,
}

impl BondingCurve {
    pub const SIZE: usize = 8 + // discriminator
        32 + // meme
        32 + // mint
        8 + // virtual_sol_reserves
        8 + // virtual_token_reserves
        8 + // real_sol_reserves
        8 + // real_token_reserves
        8 + // tokens_sold
        8 + // total_volume
        8 + // genesis_fees_accumulated
        8 + // genesis_fees_distributed
        8 + // platform_fees_accumulated
        8 + // burn_fees_accumulated
        1 + // status
        8 + // completion_threshold
        1 + // bump
        1 + // vault_bump
        64; // padding

    /// Calculate tokens out for a given SOL input using constant product formula
    /// x * y = k (simplified bonding curve)
    pub fn calculate_buy_tokens(&self, sol_in: u64) -> Option<u64> {
        // tokens_out = (sol_in * virtual_token_reserves) / (virtual_sol_reserves + sol_in)
        let numerator = (sol_in as u128).checked_mul(self.virtual_token_reserves as u128)?;
        let denominator = (self.virtual_sol_reserves as u128).checked_add(sol_in as u128)?;
        let tokens_out = numerator.checked_div(denominator)?;

        // Cap at available tokens
        let tokens_out = tokens_out.min(self.real_token_reserves as u128);

        Some(tokens_out as u64)
    }

    /// Calculate SOL out for a given token input
    pub fn calculate_sell_sol(&self, tokens_in: u64) -> Option<u64> {
        // sol_out = (tokens_in * virtual_sol_reserves) / (virtual_token_reserves + tokens_in)
        let numerator = (tokens_in as u128).checked_mul(self.virtual_sol_reserves as u128)?;
        let denominator = (self.virtual_token_reserves as u128).checked_add(tokens_in as u128)?;
        let sol_out = numerator.checked_div(denominator)?;

        // Cap at available SOL
        let sol_out = sol_out.min(self.real_sol_reserves as u128);

        Some(sol_out as u64)
    }

    /// Calculate current token price in lamports
    pub fn get_current_price(&self) -> Option<u64> {
        // price = virtual_sol_reserves / virtual_token_reserves (in lamports per token)
        let price = (self.virtual_sol_reserves as u128)
            .checked_mul(1_000_000)? // 6 decimal precision
            .checked_div(self.virtual_token_reserves as u128)?;
        Some(price as u64)
    }

    /// Update reserves after a buy
    pub fn apply_buy(&mut self, sol_in: u64, tokens_out: u64) {
        self.virtual_sol_reserves = self.virtual_sol_reserves.saturating_add(sol_in);
        self.virtual_token_reserves = self.virtual_token_reserves.saturating_sub(tokens_out);
        self.real_sol_reserves = self.real_sol_reserves.saturating_add(sol_in);
        self.real_token_reserves = self.real_token_reserves.saturating_sub(tokens_out);
        self.tokens_sold = self.tokens_sold.saturating_add(tokens_out);
        self.total_volume = self.total_volume.saturating_add(sol_in);
    }

    /// Update reserves after a sell
    pub fn apply_sell(&mut self, tokens_in: u64, sol_out: u64) {
        self.virtual_sol_reserves = self.virtual_sol_reserves.saturating_sub(sol_out);
        self.virtual_token_reserves = self.virtual_token_reserves.saturating_add(tokens_in);
        self.real_sol_reserves = self.real_sol_reserves.saturating_sub(sol_out);
        self.real_token_reserves = self.real_token_reserves.saturating_add(tokens_in);
        self.tokens_sold = self.tokens_sold.saturating_sub(tokens_in);
        self.total_volume = self.total_volume.saturating_add(sol_out);
    }

    /// Check if curve is complete
    pub fn is_complete(&self) -> bool {
        self.real_sol_reserves >= self.completion_threshold
    }
}

#[account]
#[derive(Default)]
pub struct GenesisPool {
    /// The meme this pool belongs to
    pub meme: Pubkey,
    /// Total qualified backing amount (for calculating shares)
    pub total_qualified_backing: u64,
    /// Total fees accumulated for distribution
    pub total_fees: u64,
    /// Total fees claimed
    pub total_claimed: u64,
    /// Number of qualified backers
    pub qualified_backer_count: u32,
    /// Bump seed
    pub bump: u8,
}

impl GenesisPool {
    pub const SIZE: usize = 8 + // discriminator
        32 + // meme
        8 + // total_qualified_backing
        8 + // total_fees
        8 + // total_claimed
        4 + // qualified_backer_count
        1 + // bump
        32; // padding

    /// Calculate a backer's claimable fees based on their share
    pub fn calculate_claimable(&self, backer_amount: u64, already_claimed: u64) -> Option<u64> {
        if self.total_qualified_backing == 0 {
            return Some(0);
        }

        // backer_share = (backer_amount * total_fees) / total_qualified_backing
        let total_entitled = (backer_amount as u128)
            .checked_mul(self.total_fees as u128)?
            .checked_div(self.total_qualified_backing as u128)?;

        let claimable = (total_entitled as u64).saturating_sub(already_claimed);
        Some(claimable)
    }
}
