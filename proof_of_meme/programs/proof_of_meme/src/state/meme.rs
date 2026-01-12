use anchor_lang::prelude::*;
use crate::constants::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MemeStatus {
    /// In proving grounds, accepting backers
    Proving,
    /// Goal met, token launched
    Launched,
    /// Goal not met, refunds available
    Failed,
    /// Migrated to Raydium
    Migrated,
}

impl Default for MemeStatus {
    fn default() -> Self {
        MemeStatus::Proving
    }
}

#[account]
pub struct Meme {
    /// Creator of this meme
    pub creator: Pubkey,
    /// Token mint (created on launch)
    pub mint: Pubkey,
    /// Meme name
    pub name: [u8; MAX_NAME_LENGTH],
    pub name_length: u8,
    /// Token symbol
    pub symbol: [u8; MAX_SYMBOL_LENGTH],
    pub symbol_length: u8,
    /// Metadata URI
    pub uri: [u8; MAX_URI_LENGTH],
    pub uri_length: u8,
    /// Description
    pub description: [u8; MAX_DESCRIPTION_LENGTH],
    pub description_length: u16,
    /// SOL goal to launch
    pub sol_goal: u64,
    /// Current SOL backed
    pub sol_backed: u64,
    /// Minimum unique backers required
    pub min_backers: u32,
    /// Current unique backer count
    pub backer_count: u32,
    /// Proving end timestamp
    pub proving_ends_at: i64,
    /// Current status
    pub status: MemeStatus,
    /// Timestamp of creation
    pub created_at: i64,
    /// Timestamp of launch (if launched)
    pub launched_at: i64,
    /// Creator's backing amount (skin in game)
    pub creator_backing: u64,
    /// Meme index (for unique PDA)
    pub index: u64,
    /// Bump seed
    pub bump: u8,
    /// Vault bump seed
    pub vault_bump: u8,
}

impl Meme {
    pub const SIZE: usize = 8 + // discriminator
        32 + // creator
        32 + // mint
        MAX_NAME_LENGTH + 1 + // name + length
        MAX_SYMBOL_LENGTH + 1 + // symbol + length
        MAX_URI_LENGTH + 1 + // uri + length
        MAX_DESCRIPTION_LENGTH + 2 + // description + length
        8 + // sol_goal
        8 + // sol_backed
        4 + // min_backers
        4 + // backer_count
        8 + // proving_ends_at
        1 + // status
        8 + // created_at
        8 + // launched_at
        8 + // creator_backing
        8 + // index
        1 + // bump
        1 + // vault_bump
        64; // padding

    pub fn get_name(&self) -> String {
        String::from_utf8_lossy(&self.name[..self.name_length as usize]).to_string()
    }

    pub fn get_symbol(&self) -> String {
        String::from_utf8_lossy(&self.symbol[..self.symbol_length as usize]).to_string()
    }

    pub fn get_uri(&self) -> String {
        String::from_utf8_lossy(&self.uri[..self.uri_length as usize]).to_string()
    }

    pub fn set_name(&mut self, name: &str) {
        let bytes = name.as_bytes();
        let len = bytes.len().min(MAX_NAME_LENGTH);
        self.name[..len].copy_from_slice(&bytes[..len]);
        self.name_length = len as u8;
    }

    pub fn set_symbol(&mut self, symbol: &str) {
        let bytes = symbol.as_bytes();
        let len = bytes.len().min(MAX_SYMBOL_LENGTH);
        self.symbol[..len].copy_from_slice(&bytes[..len]);
        self.symbol_length = len as u8;
    }

    pub fn set_uri(&mut self, uri: &str) {
        let bytes = uri.as_bytes();
        let len = bytes.len().min(MAX_URI_LENGTH);
        self.uri[..len].copy_from_slice(&bytes[..len]);
        self.uri_length = len as u8;
    }

    pub fn set_description(&mut self, description: &str) {
        let bytes = description.as_bytes();
        let len = bytes.len().min(MAX_DESCRIPTION_LENGTH);
        self.description[..len].copy_from_slice(&bytes[..len]);
        self.description_length = len as u16;
    }

    pub fn is_proving(&self) -> bool {
        self.status == MemeStatus::Proving
    }

    pub fn is_launched(&self) -> bool {
        self.status == MemeStatus::Launched
    }

    pub fn goal_reached(&self) -> bool {
        self.sol_backed >= self.sol_goal && self.backer_count >= self.min_backers
    }
}
