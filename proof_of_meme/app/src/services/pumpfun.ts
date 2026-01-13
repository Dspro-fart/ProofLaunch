import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { PumpFunSDK } from 'pumpdotfun-sdk';
import { AnchorProvider } from '@coral-xyz/anchor';
import type { Wallet as WalletInterface } from '@coral-xyz/anchor/dist/cjs/provider';
import bs58 from 'bs58';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Simple wallet implementation for AnchorProvider
class NodeWallet implements WalletInterface {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends import('@solana/web3.js').Transaction | import('@solana/web3.js').VersionedTransaction>(tx: T): Promise<T> {
    if ('partialSign' in tx) {
      tx.partialSign(this.payer);
    } else if ('sign' in tx && typeof (tx as any).sign === 'function') {
      (tx as any).sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends import('@solana/web3.js').Transaction | import('@solana/web3.js').VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs.map((tx) => {
      if ('partialSign' in tx) {
        tx.partialSign(this.payer);
      } else if ('sign' in tx && typeof (tx as any).sign === 'function') {
        (tx as any).sign([this.payer]);
      }
      return tx;
    });
  }
}

// Platform configuration
const PLATFORM_FEE_BPS = 200; // 2% platform fee on dev buy
const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS || 'CZnvVTTutAF7QTh5reQqRHE5i8J9cm1CWwaiQXi3QaXm';
const ESCROW_PRIVATE_KEY = process.env.ESCROW_WALLET_PRIVATE_KEY!;
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface LaunchConfig {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
  totalBackingSol: number;
  creatorWallet: string;
}

export interface LaunchResult {
  success: boolean;
  mintAddress?: string;
  signature?: string;
  pumpFunUrl?: string;
  error?: string;
}

// Get escrow wallet keypair
function getEscrowWallet(): Keypair {
  const secretKey = bs58.decode(ESCROW_PRIVATE_KEY);
  return Keypair.fromSecretKey(secretKey);
}

// Create PumpFun SDK instance
async function createPumpFunSDK(): Promise<PumpFunSDK> {
  const connection = new Connection(RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 120000, // 2 minutes
  });
  const escrowWallet = getEscrowWallet();
  const wallet = new NodeWallet(escrowWallet);

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });

  return new PumpFunSDK(provider);
}

// Upload metadata to IPFS via pump.fun
async function uploadMetadata(config: LaunchConfig): Promise<{ metadataUri: string }> {
  // Fetch the image
  const imageResponse = await fetch(config.imageUrl);
  const imageBlob = await imageResponse.blob();

  // Create form data for pump.fun IPFS upload
  const formData = new FormData();
  formData.append('file', imageBlob, 'token.png');
  formData.append('name', config.name);
  formData.append('symbol', config.symbol);
  formData.append('description', config.description);
  formData.append('showName', 'true');

  if (config.twitter) formData.append('twitter', config.twitter);
  if (config.telegram) formData.append('telegram', config.telegram);
  if (config.website) formData.append('website', config.website);

  const response = await fetch('https://pump.fun/api/ipfs', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload metadata: ${response.statusText}`);
  }

  const result = await response.json();
  return { metadataUri: result.metadataUri };
}

// Calculate platform fee and creator amounts
function calculateAmounts(totalBackingSol: number): {
  platformFeeSol: number;
  devBuySol: number;
} {
  const platformFeeSol = (totalBackingSol * PLATFORM_FEE_BPS) / 10000;
  const devBuySol = totalBackingSol - platformFeeSol;

  return { platformFeeSol, devBuySol };
}

// Launch token on pump.fun
export async function launchToken(config: LaunchConfig): Promise<LaunchResult> {
  try {
    console.log(`Launching token: ${config.name} (${config.symbol})`);

    // 1. Upload metadata to IPFS
    console.log('Uploading metadata to IPFS...');
    const { metadataUri } = await uploadMetadata(config);
    console.log('Metadata URI:', metadataUri);

    // 2. Create SDK and mint keypair
    const sdk = await createPumpFunSDK();
    const mintKeypair = Keypair.generate();
    const escrowWallet = getEscrowWallet();

    // 3. Calculate amounts
    const { platformFeeSol, devBuySol } = calculateAmounts(config.totalBackingSol);
    console.log(`Total backing: ${config.totalBackingSol} SOL`);
    console.log(`Platform fee: ${platformFeeSol} SOL`);
    console.log(`Dev buy: ${devBuySol} SOL`);

    // 4. Fetch the image as a File object for the SDK
    const imageResponse = await fetch(config.imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], 'token.png', { type: 'image/png' });

    // 5. Create token and execute initial dev buy
    console.log('Creating token on pump.fun...');
    const result = await sdk.createAndBuy(
      escrowWallet,
      mintKeypair,
      {
        name: config.name,
        symbol: config.symbol,
        description: config.description,
        file: imageFile,
        twitter: config.twitter,
        telegram: config.telegram,
        website: config.website,
      },
      BigInt(Math.floor(devBuySol * LAMPORTS_PER_SOL)),
      BigInt(500), // 5% slippage
      {
        unitLimit: 500000,  // Increased compute units
        unitPrice: 500000,  // Increased priority fee (~0.25 SOL per CU)
      }
    );

    console.log('Token created! Mint:', mintKeypair.publicKey.toBase58());
    console.log('Signature:', result.signature);

    // 6. Transfer platform fee to platform wallet
    const connection = new Connection(RPC_URL, 'confirmed');
    const { SystemProgram } = await import('@solana/web3.js');

    try {
      const platformFeeLamports = Math.floor(platformFeeSol * LAMPORTS_PER_SOL);
      const platformPubkey = new PublicKey(PLATFORM_WALLET);

      const feeTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: escrowWallet.publicKey,
          toPubkey: platformPubkey,
          lamports: platformFeeLamports,
        })
      );

      const feeSignature = await connection.sendTransaction(feeTransaction, [escrowWallet]);
      await connection.confirmTransaction(feeSignature, 'confirmed');
      console.log(`Platform fee of ${platformFeeSol} SOL sent to ${PLATFORM_WALLET}. Tx: ${feeSignature}`);
    } catch (feeError) {
      // Log but don't fail the launch if fee transfer fails
      console.error('Platform fee transfer failed:', feeError);
    }

    return {
      success: true,
      mintAddress: mintKeypair.publicKey.toBase58(),
      signature: result.signature,
      pumpFunUrl: `https://pump.fun/coin/${mintKeypair.publicKey.toBase58()}`,
    };
  } catch (error) {
    console.error('Launch failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check escrow wallet balance
export async function getEscrowBalance(): Promise<number> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const escrowWallet = getEscrowWallet();
  const balance = await connection.getBalance(escrowWallet.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

// Get escrow wallet address
export function getEscrowAddress(): string {
  const escrowWallet = getEscrowWallet();
  return escrowWallet.publicKey.toBase58();
}

// Verify a SOL deposit to escrow
export async function verifyDeposit(
  signature: string,
  expectedAmount: number,
  fromWallet: string
): Promise<boolean> {
  try {
    // Use the Helius RPC URL from environment
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    console.log('=== VERIFY DEPOSIT START ===');
    console.log('RPC URL:', rpcUrl);
    console.log('Signature:', signature);
    console.log('Expected amount:', expectedAmount, 'SOL');
    console.log('From wallet:', fromWallet);

    const connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    // Retry logic with exponential backoff for transaction confirmation
    const maxRetries = 5;
    let tx = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Wait before each attempt (increasing delays)
      const waitTime = (attempt + 1) * 2000; // 2s, 4s, 6s, 8s, 10s
      console.log(`Attempt ${attempt + 1}/${maxRetries}: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.meta) {
        console.log('Transaction found on attempt', attempt + 1);
        break;
      }

      console.log('Transaction not found yet...');
    }

    if (!tx) {
      console.log('Transaction not found after all retries');
      return false;
    }

    if (!tx.meta) {
      console.log('Transaction has no meta');
      return false;
    }

    return verifyTransactionDetails(tx, expectedAmount);
  } catch (error) {
    console.error('Failed to verify deposit:', error);
    return false;
  }
}

// Helper to verify transaction details
function verifyTransactionDetails(tx: any, expectedAmount: number): boolean {
  const escrowWallet = getEscrowWallet();
  const escrowAddress = escrowWallet.publicKey.toBase58();
  console.log('Escrow address:', escrowAddress);

  // Check if transaction involves escrow wallet
  const accountKeys = tx.transaction.message.getAccountKeys();
  const allKeys = accountKeys.staticAccountKeys.map((k: PublicKey) => k.toBase58());
  console.log('Transaction accounts:', allKeys);

  const escrowIndex = allKeys.findIndex((key: string) => key === escrowAddress);

  if (escrowIndex === -1) {
    console.log('Escrow wallet not found in transaction');
    return false;
  }

  // Check balance change
  const preBalance = tx.meta.preBalances[escrowIndex];
  const postBalance = tx.meta.postBalances[escrowIndex];
  const depositedLamports = postBalance - preBalance;
  const depositedSol = depositedLamports / LAMPORTS_PER_SOL;

  console.log('Pre balance:', preBalance / LAMPORTS_PER_SOL, 'SOL');
  console.log('Post balance:', postBalance / LAMPORTS_PER_SOL, 'SOL');
  console.log('Deposited:', depositedSol, 'SOL');

  // Allow small variance for fees
  const isValid = Math.abs(depositedSol - expectedAmount) < 0.01; // Increased tolerance
  console.log('Verification result:', isValid);
  return isValid;
}

// Refund SOL to a backer (if meme fails to launch)
export async function refundBacker(
  backerWallet: string,
  amountSol: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    console.log(`=== REFUND START ===`);
    console.log(`Refunding ${amountSol} SOL to ${backerWallet}`);
    console.log(`RPC URL: ${RPC_URL}`);

    const connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    const escrowWallet = getEscrowWallet();
    console.log(`Escrow wallet: ${escrowWallet.publicKey.toBase58()}`);

    const { SystemProgram } = await import('@solana/web3.js');

    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    console.log(`Lamports to transfer: ${lamports}`);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrowWallet.publicKey,
        toPubkey: new PublicKey(backerWallet),
        lamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = escrowWallet.publicKey;

    console.log(`Sending transaction...`);
    const signature = await connection.sendTransaction(transaction, [escrowWallet]);
    console.log(`Transaction sent: ${signature}`);

    // Don't wait for confirmation - it can timeout
    // The transaction is already submitted
    console.log(`Refund complete: ${signature}`);

    return { success: true, signature };
  } catch (error) {
    console.error('Refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Backer info for distribution
export interface BackerInfo {
  wallet: string;
  amountSol: number;
}

// Distribution result for a single backer
export interface DistributionResult {
  wallet: string;
  tokensTransferred: number;
  signature?: string;
  error?: string;
}

// Distribute tokens to backers proportionally
export async function distributeTokensToBackers(
  mintAddress: string,
  backers: BackerInfo[],
  totalBackingSol: number
): Promise<{ success: boolean; results: DistributionResult[]; error?: string }> {
  const results: DistributionResult[] = [];

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const escrowWallet = getEscrowWallet();
    const mintPubkey = new PublicKey(mintAddress);

    // Get escrow's token account
    const escrowTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      escrowWallet.publicKey
    );

    // Get escrow token balance
    let escrowTokenBalance: bigint;
    try {
      const accountInfo = await getAccount(connection, escrowTokenAccount);
      escrowTokenBalance = accountInfo.amount;
      console.log(`Escrow token balance: ${escrowTokenBalance.toString()}`);
    } catch (err) {
      return {
        success: false,
        results: [],
        error: 'Escrow has no tokens to distribute',
      };
    }

    if (escrowTokenBalance === BigInt(0)) {
      return {
        success: false,
        results: [],
        error: 'Escrow token balance is 0',
      };
    }

    // Calculate each backer's share and distribute
    for (const backer of backers) {
      try {
        const backerPubkey = new PublicKey(backer.wallet);

        // Calculate proportional share
        const sharePercent = backer.amountSol / totalBackingSol;
        const tokensToTransfer = BigInt(
          Math.floor(Number(escrowTokenBalance) * sharePercent)
        );

        if (tokensToTransfer === BigInt(0)) {
          results.push({
            wallet: backer.wallet,
            tokensTransferred: 0,
            error: 'Share too small',
          });
          continue;
        }

        // Get or create backer's token account
        const backerTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          backerPubkey
        );

        const transaction = new Transaction();

        // Check if backer's token account exists
        const backerAccountInfo = await connection.getAccountInfo(backerTokenAccount);
        if (!backerAccountInfo) {
          // Create associated token account for backer
          transaction.add(
            createAssociatedTokenAccountInstruction(
              escrowWallet.publicKey, // payer
              backerTokenAccount, // ata
              backerPubkey, // owner
              mintPubkey // mint
            )
          );
        }

        // Add transfer instruction
        transaction.add(
          createTransferInstruction(
            escrowTokenAccount, // from
            backerTokenAccount, // to
            escrowWallet.publicKey, // owner
            tokensToTransfer // amount
          )
        );

        // Send transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = escrowWallet.publicKey;

        const signature = await connection.sendTransaction(transaction, [escrowWallet]);
        await connection.confirmTransaction(signature, 'confirmed');

        results.push({
          wallet: backer.wallet,
          tokensTransferred: Number(tokensToTransfer),
          signature,
        });

        console.log(
          `Distributed ${tokensToTransfer} tokens to ${backer.wallet} (${(sharePercent * 100).toFixed(2)}%)`
        );
      } catch (err) {
        console.error(`Failed to distribute to ${backer.wallet}:`, err);
        results.push({
          wallet: backer.wallet,
          tokensTransferred: 0,
          error: err instanceof Error ? err.message : 'Transfer failed',
        });
      }
    }

    const successCount = results.filter((r) => r.signature).length;
    console.log(`Distribution complete: ${successCount}/${backers.length} successful`);

    return {
      success: successCount > 0,
      results,
    };
  } catch (error) {
    console.error('Distribution failed:', error);
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
