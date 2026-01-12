use anchor_lang::prelude::*;

#[error_code]
pub enum ProofOfMemeError {
    // Submission errors
    #[msg("Name too long (max 32 characters)")]
    NameTooLong,
    #[msg("Symbol too long (max 10 characters)")]
    SymbolTooLong,
    #[msg("URI too long (max 200 characters)")]
    UriTooLong,
    #[msg("Description too long (max 500 characters)")]
    DescriptionTooLong,
    #[msg("SOL goal below minimum (20 SOL)")]
    GoalTooLow,
    #[msg("SOL goal above maximum (500 SOL)")]
    GoalTooHigh,
    #[msg("Minimum backers below 30")]
    MinBackersTooLow,
    #[msg("Duration below minimum (24 hours)")]
    DurationTooShort,
    #[msg("Duration above maximum (7 days)")]
    DurationTooLong,

    // Backing errors
    #[msg("Backing amount below minimum (0.5 SOL for fee eligibility)")]
    BackingTooLow,
    #[msg("Backing would exceed maximum 10% per wallet")]
    BackingExceedsMaximum,
    #[msg("Proving period has ended")]
    ProvingEnded,
    #[msg("Proving period still active")]
    ProvingStillActive,
    #[msg("Meme already launched")]
    AlreadyLaunched,
    #[msg("Meme already failed/refunded")]
    AlreadyFailed,
    #[msg("No backing found for this wallet")]
    NoBackingFound,

    // Goal errors
    #[msg("SOL goal not reached")]
    GoalNotReached,
    #[msg("Minimum backers not reached")]
    MinBackersNotReached,

    // Trading errors
    #[msg("Curve not active")]
    CurveNotActive,
    #[msg("Curve already completed")]
    CurveCompleted,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Insufficient tokens")]
    InsufficientTokens,
    #[msg("Insufficient SOL")]
    InsufficientSol,

    // Fee errors
    #[msg("No fees to claim")]
    NoFeesToClaim,
    #[msg("Not a genesis backer")]
    NotGenesisBacker,

    // Migration errors
    #[msg("Curve not complete - cannot migrate yet")]
    CurveNotComplete,
    #[msg("Already migrated")]
    AlreadyMigrated,

    // Math errors
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid fee configuration")]
    InvalidFeeConfig,

    // Security errors
    #[msg("Invalid platform authority")]
    InvalidPlatformAuthority,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Account mismatch")]
    AccountMismatch,
    #[msg("Invalid meme account")]
    InvalidMemeAccount,
    #[msg("Invalid curve account")]
    InvalidCurveAccount,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Name cannot be empty")]
    EmptyName,
    #[msg("Symbol cannot be empty")]
    EmptySymbol,
    #[msg("Invalid token amount")]
    InvalidTokenAmount,
    #[msg("Backing already withdrawn")]
    BackingAlreadyWithdrawn,
}
