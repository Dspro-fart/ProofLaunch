import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAccount,
  burn,
} from '@solana/spl-token';
import { Raydium, TxVersion, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import {
  config,
  getMigrationWallet,
  WSOL_MINT,
  RAYDIUM_CPMM_PROGRAM_ID,
} from './config';

export interface MigrationParams {
  connection: Connection;
  meme: PublicKey;
  mint: PublicKey;
  curvePublicKey: PublicKey;
  solAmount: BN;
  tokenAmount: BN;
}

export interface MigrationResult {
  poolId: PublicKey;
  lpMint: PublicKey;
  createPoolTx: string;
  burnLpTx?: string;
}

/**
 * Migrate a completed bonding curve to Raydium CPMM pool
 * This mirrors pump.fun's approach:
 * 1. Create CPMM pool with SOL + Token
 * 2. Burn LP tokens to make liquidity permanent
 */
export async function migrateToRaydium(params: MigrationParams): Promise<MigrationResult> {
  const { connection, mint, solAmount, tokenAmount } = params;
  const wallet = getMigrationWallet();

  console.log('Initializing Raydium SDK...');

  // Initialize Raydium SDK
  const raydium = await Raydium.load({
    connection,
    owner: wallet,
    cluster: 'mainnet', // Use 'devnet' for testing
    disableFeatureCheck: true,
    blockhashCommitment: 'finalized',
  });

  // Calculate initial price based on curve's final state
  // Price = SOL / Tokens
  const solAmountNum = solAmount.toNumber() / LAMPORTS_PER_SOL;
  const tokenAmountNum = tokenAmount.toNumber() / 1e6; // Assuming 6 decimals
  const initialPrice = solAmountNum / tokenAmountNum;

  console.log(`Initial price: ${initialPrice} SOL per token`);
  console.log(`SOL to add: ${solAmountNum}`);
  console.log(`Tokens to add: ${tokenAmountNum}`);

  // Create CPMM pool
  console.log('Creating CPMM pool...');

  const createPoolResult = await createCpmmPool({
    raydium,
    connection,
    wallet,
    mintA: WSOL_MINT, // SOL side
    mintB: mint,       // Token side
    mintAAmount: solAmount,
    mintBAmount: tokenAmount,
  });

  console.log(`Pool created: ${createPoolResult.poolId.toBase58()}`);
  console.log(`LP Mint: ${createPoolResult.lpMint.toBase58()}`);

  // Burn LP tokens if auto-burn is enabled
  let burnLpTx: string | undefined;

  if (config.autoBurnLp) {
    console.log('Burning LP tokens...');
    burnLpTx = await burnLpTokens({
      connection,
      wallet,
      lpMint: createPoolResult.lpMint,
    });
    console.log(`LP tokens burned: ${burnLpTx}`);
  }

  return {
    poolId: createPoolResult.poolId,
    lpMint: createPoolResult.lpMint,
    createPoolTx: createPoolResult.txSignature,
    burnLpTx,
  };
}

interface CreatePoolParams {
  raydium: Raydium;
  connection: Connection;
  wallet: Keypair;
  mintA: PublicKey; // WSOL
  mintB: PublicKey; // Token
  mintAAmount: BN;
  mintBAmount: BN;
}

interface CreatePoolResult {
  poolId: PublicKey;
  lpMint: PublicKey;
  txSignature: string;
}

/**
 * Create a CPMM pool on Raydium
 */
async function createCpmmPool(params: CreatePoolParams): Promise<CreatePoolResult> {
  const { raydium, connection, wallet, mintA, mintB, mintAAmount, mintBAmount } = params;

  // Get mint info
  const mintAInfo = await connection.getParsedAccountInfo(mintA);
  const mintBInfo = await connection.getParsedAccountInfo(mintB);

  if (!mintAInfo.value || !mintBInfo.value) {
    throw new Error('Could not fetch mint info');
  }

  const mintADecimals = (mintAInfo.value.data as any).parsed.info.decimals;
  const mintBDecimals = (mintBInfo.value.data as any).parsed.info.decimals;

  // Fetch available CPMM configs from Raydium API
  // The SDK requires using predefined fee configs
  const cpmmConfigs = await raydium.api.getCpmmConfigs();

  // Find the 0.25% fee tier config (id: 4) - standard for meme coins
  // Fee tiers: 0.01% (id:1), 0.05% (id:2), 0.25% (id:4), 1% (id:5)
  const feeConfig = cpmmConfigs.find((c: any) => c.tradeFeeRate === 2500) || cpmmConfigs[0];

  if (!feeConfig) {
    throw new Error('Could not find suitable fee config');
  }

  console.log(`Using fee config: ${feeConfig.id} (${feeConfig.tradeFeeRate / 10000}% fee)`);

  // Standard Raydium CPMM fee receiver
  const CPMM_FEE_RECEIVER = new PublicKey('G11FKBRaAkHAKuLCgLM6K6NUc9rTjPAznRCjZifrTQe2');

  // Use Raydium SDK to create CPMM pool
  // The SDK handles all the account derivation and instruction building
  const { execute, extInfo } = await raydium.cpmm.createPool({
    programId: RAYDIUM_CPMM_PROGRAM_ID,
    poolFeeAccount: CPMM_FEE_RECEIVER,
    mintA: {
      address: mintA.toBase58(),
      decimals: mintADecimals,
      programId: TOKEN_PROGRAM_ID.toBase58(),
    },
    mintB: {
      address: mintB.toBase58(),
      decimals: mintBDecimals,
      programId: TOKEN_PROGRAM_ID.toBase58(),
    },
    mintAAmount,
    mintBAmount,
    startTime: new BN(0), // Start immediately
    feeConfig,
    associatedOnly: true,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion: TxVersion.V0,
    computeBudgetConfig: {
      units: 400000,
      microLamports: 50000,
    },
  });

  // Execute the transaction
  const { txId } = await execute({ sendAndConfirm: true });

  return {
    poolId: new PublicKey(extInfo.address.poolId),
    lpMint: new PublicKey(extInfo.address.lpMint),
    txSignature: txId,
  };
}

interface BurnLpParams {
  connection: Connection;
  wallet: Keypair;
  lpMint: PublicKey;
}

/**
 * Burn all LP tokens to make liquidity permanent (like pump.fun)
 */
async function burnLpTokens(params: BurnLpParams): Promise<string> {
  const { connection, wallet, lpMint } = params;

  // Get wallet's LP token account
  const lpTokenAccount = await getAssociatedTokenAddress(lpMint, wallet.publicKey);

  // Get LP token balance
  const lpAccountInfo = await getAccount(connection, lpTokenAccount);
  const lpBalance = lpAccountInfo.amount;

  if (lpBalance === BigInt(0)) {
    throw new Error('No LP tokens to burn');
  }

  console.log(`Burning ${lpBalance.toString()} LP tokens...`);

  // Burn all LP tokens
  const txSignature = await burn(
    connection,
    wallet,
    lpTokenAccount,
    lpMint,
    wallet,
    lpBalance
  );

  return txSignature;
}

/**
 * Alternative: Send LP tokens to a dead address (another way to "burn")
 * Some protocols use this method for transparency
 */
export async function sendLpToDeadAddress(params: BurnLpParams): Promise<string> {
  const { connection, wallet, lpMint } = params;

  // Dead address (all zeros except checksum)
  const DEAD_ADDRESS = new PublicKey('1nc1nerator11111111111111111111111111111111');

  // Get wallet's LP token account
  const lpTokenAccount = await getAssociatedTokenAddress(lpMint, wallet.publicKey);

  // Get LP token balance
  const lpAccountInfo = await getAccount(connection, lpTokenAccount);
  const lpBalance = lpAccountInfo.amount;

  if (lpBalance === BigInt(0)) {
    throw new Error('No LP tokens to send');
  }

  // Get or create dead address's ATA
  const deadAta = await getAssociatedTokenAddress(lpMint, DEAD_ADDRESS, true);

  const transaction = new Transaction();

  // Check if dead address ATA exists
  const deadAtaInfo = await connection.getAccountInfo(deadAta);
  if (!deadAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        deadAta,
        DEAD_ADDRESS,
        lpMint
      )
    );
  }

  // Transfer LP tokens to dead address
  const { createTransferInstruction } = await import('@solana/spl-token');
  transaction.add(
    createTransferInstruction(
      lpTokenAccount,
      deadAta,
      wallet.publicKey,
      lpBalance
    )
  );

  const txSignature = await sendAndConfirmTransaction(connection, transaction, [wallet]);

  return txSignature;
}

/**
 * Helper: Wrap SOL to WSOL
 */
export async function wrapSol(
  connection: Connection,
  wallet: Keypair,
  amount: BN
): Promise<PublicKey> {
  const wsolAta = await getAssociatedTokenAddress(WSOL_MINT, wallet.publicKey);

  const transaction = new Transaction();

  // Check if WSOL ATA exists
  const wsolAtaInfo = await connection.getAccountInfo(wsolAta);
  if (!wsolAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        wsolAta,
        wallet.publicKey,
        WSOL_MINT
      )
    );
  }

  // Transfer SOL to WSOL account
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: wsolAta,
      lamports: amount.toNumber(),
    })
  );

  // Sync native (updates WSOL balance)
  transaction.add(createSyncNativeInstruction(wsolAta));

  await sendAndConfirmTransaction(connection, transaction, [wallet]);

  return wsolAta;
}

/**
 * Helper: Unwrap WSOL back to SOL
 */
export async function unwrapSol(
  connection: Connection,
  wallet: Keypair
): Promise<string> {
  const wsolAta = await getAssociatedTokenAddress(WSOL_MINT, wallet.publicKey);

  // Close the WSOL account, returning SOL to wallet
  const transaction = new Transaction().add(
    createCloseAccountInstruction(wsolAta, wallet.publicKey, wallet.publicKey)
  );

  return sendAndConfirmTransaction(connection, transaction, [wallet]);
}
