import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// IDL Type - This will be generated from the Anchor build
// For now, we define the interface manually
export type ProofOfMeme = {
  version: string;
  name: string;
  instructions: any[];
  accounts: any[];
  types: any[];
  errors: any[];
};

// Account types for TypeScript
export interface PlatformConfig {
  authority: PublicKey;
  submissionFee: BN;
  platformFeeBps: number;
  genesisFeeBps: number;
  burnFeeBps: number;
  totalMemesSubmitted: BN;
  totalMemesLaunched: BN;
  totalPlatformFees: BN;
  bump: number;
}

export enum MemeStatus {
  Proving = 'proving',
  Launched = 'launched',
  Failed = 'failed',
  Migrated = 'migrated',
}

export interface Meme {
  creator: PublicKey;
  mint: PublicKey;
  name: number[];
  symbol: number[];
  uri: number[];
  description: number[];
  solGoal: BN;
  solBacked: BN;
  minBackers: number;
  backerCount: number;
  provingEndsAt: BN;
  status: any;
  createdAt: BN;
  launchedAt: BN;
  creatorBacking: BN;
  index: BN;
  bump: number;
  vaultBump: number;
}

export interface Backing {
  backer: PublicKey;
  meme: PublicKey;
  amount: BN;
  qualifiesForFees: boolean;
  backedAt: BN;
  withdrawn: boolean;
  tokensReceived: BN;
  feesClaimed: BN;
  genesisShareBps: number;
  bump: number;
}

export enum CurveStatus {
  Active = 'active',
  Complete = 'complete',
  Migrated = 'migrated',
}

export interface BondingCurve {
  meme: PublicKey;
  mint: PublicKey;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  realSolReserves: BN;
  realTokenReserves: BN;
  tokensSold: BN;
  totalVolume: BN;
  genesisFeesAccumulated: BN;
  genesisFeesDistributed: BN;
  platformFeesAccumulated: BN;
  burnFeesAccumulated: BN;
  status: any;
  completionThreshold: BN;
  bump: number;
  vaultBump: number;
}

export interface GenesisPool {
  meme: PublicKey;
  totalQualifiedBacking: BN;
  totalFees: BN;
  totalClaimed: BN;
  qualifiedBackerCount: number;
  bump: number;
}
