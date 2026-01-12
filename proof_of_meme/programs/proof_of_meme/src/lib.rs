use anchor_lang::prelude::*;

declare_id!("BUo4JqihPJkTc9PnjnAcZiYCeA9GZie1Wazknjqi1sYr");

pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;

use instructions::*;

#[program]
pub mod proof_of_meme {
    use super::*;

    /// Initialize the platform config (one-time setup)
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        submission_fee: u64,
        platform_fee_bps: u16,
        genesis_fee_bps: u16,
        burn_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_platform::initialize_platform(ctx, submission_fee, platform_fee_bps, genesis_fee_bps, burn_fee_bps)
    }

    /// Creator submits a new meme to the Proving Grounds
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
        instructions::submit_meme::submit_meme(ctx, name, symbol, uri, description, sol_goal, min_backers, duration_seconds)
    }

    /// Back a meme in the Proving Grounds
    pub fn back_meme(ctx: Context<BackMeme>, amount: u64) -> Result<()> {
        instructions::back_meme::back_meme(ctx, amount)
    }

    /// Withdraw backing before launch (if goal not met)
    pub fn withdraw_backing(ctx: Context<WithdrawBacking>) -> Result<()> {
        instructions::withdraw_backing::withdraw_backing(ctx)
    }

    /// Finalize proving and launch token
    pub fn finalize_proving(ctx: Context<FinalizeProving>) -> Result<()> {
        instructions::finalize_proving::finalize_proving(ctx)
    }

    /// Mark meme as failed (goal not reached)
    pub fn mark_meme_failed(ctx: Context<MarkMemeFailed>) -> Result<()> {
        instructions::finalize_proving::mark_meme_failed(ctx)
    }

    /// Buy tokens on the bonding curve
    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        instructions::buy_tokens::buy_tokens(ctx, sol_amount, min_tokens_out)
    }

    /// Sell tokens on the bonding curve
    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        instructions::sell_tokens::sell_tokens(ctx, token_amount, min_sol_out)
    }

    /// Genesis backers claim accumulated trading fees
    pub fn claim_genesis_fees(ctx: Context<ClaimGenesisFees>) -> Result<()> {
        instructions::claim_genesis_fees::claim_genesis_fees(ctx)
    }

    /// Migrate to Raydium when bonding curve is complete
    pub fn migrate_to_raydium(ctx: Context<MigrateToRaydium>) -> Result<()> {
        instructions::migrate_to_raydium::migrate_to_raydium(ctx)
    }
}
