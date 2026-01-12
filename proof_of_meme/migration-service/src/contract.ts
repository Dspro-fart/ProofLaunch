import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN, Idl } from '@coral-xyz/anchor';
import { config, getMigrationWallet, getConnection } from './config';

// PDA seeds (must match the smart contract)
const PLATFORM_SEED = Buffer.from('platform');
const MEME_SEED = Buffer.from('meme');
const CURVE_SEED = Buffer.from('curve');
const CURVE_VAULT_SEED = Buffer.from('curve_vault');

/**
 * Get Platform PDA
 */
export function getPlatformPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], programId);
}

/**
 * Get Meme PDA
 */
export function getMemePDA(programId: PublicKey, index: number | BN): [PublicKey, number] {
  const indexBn = typeof index === 'number' ? new BN(index) : index;
  return PublicKey.findProgramAddressSync(
    [MEME_SEED, indexBn.toArrayLike(Buffer, 'le', 8)],
    programId
  );
}

/**
 * Get Curve PDA
 */
export function getCurvePDA(programId: PublicKey, meme: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CURVE_SEED, meme.toBuffer()], programId);
}

/**
 * Get Curve Vault PDA
 */
export function getCurveVaultPDA(programId: PublicKey, meme: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CURVE_VAULT_SEED, meme.toBuffer()], programId);
}

/**
 * Decoded bonding curve data
 */
export interface CurveData {
  publicKey: PublicKey;
  meme: PublicKey;
  mint: PublicKey;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  realSolReserves: BN;
  realTokenReserves: BN;
  tokensSold: BN;
  totalVolume: BN;
  status: 'active' | 'complete' | 'migrated';
  completionThreshold: BN;
  bump: number;
  vaultBump: number;
}

/**
 * Decoded meme data
 */
export interface MemeData {
  publicKey: PublicKey;
  creator: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  description: string;
  solGoal: BN;
  solBacked: BN;
  minBackers: number;
  backerCount: number;
  provingEndsAt: BN;
  status: 'proving' | 'launched' | 'failed' | 'migrated';
  createdAt: BN;
  launchedAt: BN;
  index: BN;
}

/**
 * Contract interaction helper
 */
export class ProofOfMemeContract {
  private connection: Connection;
  private programId: PublicKey;
  private wallet: Keypair;

  constructor() {
    this.connection = getConnection();
    this.programId = config.programId;
    this.wallet = getMigrationWallet();
  }

  /**
   * Fetch all completed curves that are ready for migration
   */
  async getCompletedCurves(): Promise<CurveData[]> {
    // Get all program accounts
    // Filter by account discriminator for BondingCurve type
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      commitment: 'confirmed',
    });

    const curves: CurveData[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        // Try to decode as bonding curve
        const curve = this.decodeCurve(pubkey, account.data);
        if (curve && curve.status === 'complete') {
          curves.push(curve);
        }
      } catch {
        // Not a bonding curve account
        continue;
      }
    }

    return curves;
  }

  /**
   * Fetch a specific curve by meme public key
   */
  async getCurve(meme: PublicKey): Promise<CurveData | null> {
    const [curvePDA] = getCurvePDA(this.programId, meme);

    try {
      const accountInfo = await this.connection.getAccountInfo(curvePDA);
      if (!accountInfo) return null;

      return this.decodeCurve(curvePDA, accountInfo.data);
    } catch {
      return null;
    }
  }

  /**
   * Fetch meme data
   */
  async getMeme(index: number | BN): Promise<MemeData | null> {
    const [memePDA] = getMemePDA(this.programId, index);

    try {
      const accountInfo = await this.connection.getAccountInfo(memePDA);
      if (!accountInfo) return null;

      return this.decodeMeme(memePDA, accountInfo.data);
    } catch {
      return null;
    }
  }

  /**
   * Call the migrate_to_raydium instruction on the smart contract
   * This marks the curve as migrated on-chain
   */
  async markCurveMigrated(memeIndex: number | BN): Promise<string> {
    const [platformPDA] = getPlatformPDA(this.programId);
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, memePDA);

    // Get platform authority
    const platformInfo = await this.connection.getAccountInfo(platformPDA);
    if (!platformInfo) throw new Error('Platform not initialized');

    // Decode platform authority (first 32 bytes after discriminator)
    const platformAuthority = new PublicKey(platformInfo.data.slice(8, 40));

    // Build transaction (would use program.methods in production)
    // For now, this is a placeholder showing the account structure
    console.log('Would call migrate_to_raydium with accounts:');
    console.log(`  migrator: ${this.wallet.publicKey.toBase58()}`);
    console.log(`  platform: ${platformPDA.toBase58()}`);
    console.log(`  meme: ${memePDA.toBase58()}`);
    console.log(`  curve: ${curvePDA.toBase58()}`);
    console.log(`  platformAuthority: ${platformAuthority.toBase58()}`);
    console.log(`  curveVault: ${curveVaultPDA.toBase58()}`);

    // In production, this would be:
    // const tx = await program.methods.migrateToRaydium()
    //   .accounts({ ... })
    //   .rpc();

    return 'placeholder_tx_signature';
  }

  /**
   * Get the SOL balance in a curve's vault
   */
  async getCurveVaultBalance(meme: PublicKey): Promise<number> {
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, meme);
    const balance = await this.connection.getBalance(curveVaultPDA);
    return balance;
  }

  /**
   * Decode curve account data
   * Note: This is a simplified decoder. In production, use the IDL.
   */
  private decodeCurve(pubkey: PublicKey, data: Buffer): CurveData | null {
    if (data.length < 100) return null;

    // Skip 8-byte discriminator
    let offset = 8;

    try {
      const meme = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const mint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const virtualSolReserves = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const virtualTokenReserves = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const realSolReserves = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const realTokenReserves = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const tokensSold = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const totalVolume = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      // Skip genesis fees fields (3x u64 = 24 bytes)
      offset += 24;

      // Status enum (1 byte for discriminant)
      const statusByte = data[offset];
      offset += 1;

      let status: 'active' | 'complete' | 'migrated';
      switch (statusByte) {
        case 0:
          status = 'active';
          break;
        case 1:
          status = 'complete';
          break;
        case 2:
          status = 'migrated';
          break;
        default:
          return null;
      }

      const completionThreshold = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      const bump = data[offset];
      offset += 1;

      const vaultBump = data[offset];

      return {
        publicKey: pubkey,
        meme,
        mint,
        virtualSolReserves,
        virtualTokenReserves,
        realSolReserves,
        realTokenReserves,
        tokensSold,
        totalVolume,
        status,
        completionThreshold,
        bump,
        vaultBump,
      };
    } catch {
      return null;
    }
  }

  /**
   * Decode meme account data
   * Note: This is a simplified decoder. In production, use the IDL.
   */
  private decodeMeme(pubkey: PublicKey, data: Buffer): MemeData | null {
    if (data.length < 200) return null;

    // This would be properly implemented with IDL deserialization
    // Placeholder for now
    return null;
  }

  /**
   * Decode a fixed-length string from buffer
   */
  private decodeString(buffer: Buffer, offset: number, maxLength: number): string {
    const slice = buffer.slice(offset, offset + maxLength);
    const nullIndex = slice.indexOf(0);
    const end = nullIndex === -1 ? maxLength : nullIndex;
    return slice.slice(0, end).toString('utf8');
  }
}
