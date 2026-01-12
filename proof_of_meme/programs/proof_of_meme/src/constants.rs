// Basis points (1 bp = 0.01%)
pub const BPS_DENOMINATOR: u64 = 10_000;

// Goal constraints
pub const MIN_SOL_GOAL: u64 = 20_000_000_000; // 20 SOL in lamports
pub const MAX_SOL_GOAL: u64 = 500_000_000_000; // 500 SOL in lamports
pub const MIN_BACKERS: u32 = 30;
pub const MAX_BACKING_PERCENTAGE_BPS: u64 = 1_000; // 10% max per wallet

// Time constraints
pub const MIN_PROVING_DURATION: i64 = 24 * 60 * 60; // 24 hours
pub const MAX_PROVING_DURATION: i64 = 7 * 24 * 60 * 60; // 7 days

// Backing constraints
pub const MIN_BACKING_AMOUNT: u64 = 500_000_000; // 0.5 SOL minimum for fee eligibility

// Token supply
pub const TOKEN_DECIMALS: u8 = 6;
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1 billion with 6 decimals

// Bonding curve
pub const CURVE_COMPLETION_SOL: u64 = 85_000_000_000; // ~85 SOL to complete curve (like pump.fun)
pub const GENESIS_ALLOCATION_BPS: u64 = 2_000; // 20% of supply to genesis backers

// Migration
pub const MIGRATION_FEE: u64 = 1_500_000_000; // 1.5 SOL

// Default fee splits (can be configured)
pub const DEFAULT_PLATFORM_FEE_BPS: u16 = 2_000; // 20% of trading fee
pub const DEFAULT_GENESIS_FEE_BPS: u16 = 7_000; // 70% of trading fee
pub const DEFAULT_BURN_FEE_BPS: u16 = 1_000; // 10% of trading fee
pub const TRADING_FEE_BPS: u64 = 100; // 1% total trading fee

// Seeds
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const MEME_SEED: &[u8] = b"meme";
pub const BACKING_SEED: &[u8] = b"backing";
pub const CURVE_SEED: &[u8] = b"curve";
pub const GENESIS_POOL_SEED: &[u8] = b"genesis_pool";
pub const VAULT_SEED: &[u8] = b"vault";

// String length limits
pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_SYMBOL_LENGTH: usize = 10;
pub const MAX_URI_LENGTH: usize = 200;
pub const MAX_DESCRIPTION_LENGTH: usize = 500;
