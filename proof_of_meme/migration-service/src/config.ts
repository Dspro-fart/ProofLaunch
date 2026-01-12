import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

// bs58 doesn't need a separate import - use base-x which is already in dependencies
const bs58 = require('bs58') as { decode: (input: string) => Uint8Array; encode: (input: Uint8Array) => string };

dotenv.config();

// Raydium program IDs (mainnet)
export const RAYDIUM_CPMM_PROGRAM_ID = new PublicKey('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C');
export const RAYDIUM_AUTHORITY = new PublicKey('GpMZbSM2GgvTKHJizy6r6p2RJY8vdJJ1sRKrPuLDWqAq');
export const RAYDIUM_FEE_RECEIVER = new PublicKey('G11FKBRaAkHAKuLCgLM6K6NUc9rTjPAznRCjZifrTQe2');

// Token program IDs
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Wrapped SOL mint
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Config values from environment
export const config = {
  rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  programId: new PublicKey(process.env.PROGRAM_ID || 'BUo4JqihPJkTc9PnjnAcZiYCeA9GZie1Wazknjqi1sYr'),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000'),
  minWalletBalanceSol: parseFloat(process.env.MIN_WALLET_BALANCE_SOL || '0.5'),
  autoBurnLp: process.env.AUTO_BURN_LP !== 'false',
};

// Get migration wallet from environment
export function getMigrationWallet(): Keypair {
  const privateKey = process.env.MIGRATION_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('MIGRATION_WALLET_PRIVATE_KEY not set in environment');
  }

  try {
    // Try base58 first
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  } catch {
    // Try JSON array format
    try {
      const parsed = JSON.parse(privateKey);
      return Keypair.fromSecretKey(Uint8Array.from(parsed));
    } catch {
      throw new Error('Invalid MIGRATION_WALLET_PRIVATE_KEY format. Use base58 or JSON array.');
    }
  }
}

// Get connection
export function getConnection(): Connection {
  return new Connection(config.rpcUrl, 'confirmed');
}
