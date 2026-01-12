import { PublicKey } from '@solana/web3.js';

// Program ID - Update this after deployment
export const PROGRAM_ID = new PublicKey('11111111111111111111111111111111'); // Placeholder

// Solana constants
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const BPS_DENOMINATOR = 10_000;

// Goal constraints
export const MIN_SOL_GOAL = 20; // 20 SOL
export const MAX_SOL_GOAL = 500; // 500 SOL
export const MIN_BACKERS = 30;
export const MAX_BACKING_PERCENTAGE_BPS = 1_000; // 10% max per wallet

// Time constraints
export const MIN_PROVING_DURATION = 24 * 60 * 60; // 24 hours in seconds
export const MAX_PROVING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

// Backing constraints
export const MIN_BACKING_AMOUNT = 0.5; // 0.5 SOL minimum for fee eligibility

// Token supply
export const TOKEN_DECIMALS = 6;
export const TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

// Bonding curve
export const CURVE_COMPLETION_SOL = 85; // ~85 SOL to complete curve
export const GENESIS_ALLOCATION_BPS = 2_000; // 20% of supply to genesis backers

// Migration
export const MIGRATION_FEE = 1.5; // 1.5 SOL

// Default fee splits
export const DEFAULT_PLATFORM_FEE_BPS = 2_000; // 20% of trading fee
export const DEFAULT_GENESIS_FEE_BPS = 7_000; // 70% of trading fee
export const DEFAULT_BURN_FEE_BPS = 1_000; // 10% of trading fee
export const TRADING_FEE_BPS = 100; // 1% total trading fee

// Seeds (as Buffers for PDA derivation)
export const PLATFORM_SEED = Buffer.from('platform');
export const MEME_SEED = Buffer.from('meme');
export const BACKING_SEED = Buffer.from('backing');
export const VAULT_SEED = Buffer.from('vault');
export const CURVE_SEED = Buffer.from('curve');
export const GENESIS_POOL_SEED = Buffer.from('genesis_pool');
export const CURVE_VAULT_SEED = Buffer.from('curve_vault');
export const MINT_SEED = Buffer.from('mint');

// String length limits
export const MAX_NAME_LENGTH = 32;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_URI_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
