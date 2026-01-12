import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { config, getConnection, getMigrationWallet } from './config';
import { migrateToRaydium } from './raydium';

// PDA seeds (must match the smart contract)
const CURVE_SEED = Buffer.from('curve');
const MEME_SEED = Buffer.from('meme');

interface BondingCurve {
  meme: PublicKey;
  mint: PublicKey;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  realSolReserves: BN;
  realTokenReserves: BN;
  tokensSold: BN;
  totalVolume: BN;
  status: any;
  completionThreshold: BN;
  bump: number;
  vaultBump: number;
}

interface Meme {
  creator: PublicKey;
  mint: PublicKey;
  name: number[];
  symbol: number[];
  uri: number[];
  status: any;
  index: BN;
}

// Curve status enum
const CurveStatus = {
  Active: { active: {} },
  Complete: { complete: {} },
  Migrated: { migrated: {} },
};

function isCurveComplete(status: any): boolean {
  return status.complete !== undefined;
}

function isCurveMigrated(status: any): boolean {
  return status.migrated !== undefined;
}

function decodeString(buffer: number[]): string {
  let end = buffer.indexOf(0);
  if (end === -1) end = buffer.length;
  return Buffer.from(buffer.slice(0, end)).toString('utf8');
}

/**
 * Watches for completed bonding curves and triggers Raydium migration
 */
export class CurveWatcher {
  private connection: Connection;
  private programId: PublicKey;
  private isRunning: boolean = false;
  private processedCurves: Set<string> = new Set();

  constructor() {
    this.connection = getConnection();
    this.programId = config.programId;
  }

  /**
   * Start watching for completed curves
   */
  async start(): Promise<void> {
    console.log('Starting Curve Watcher...');
    console.log(`Program ID: ${this.programId.toBase58()}`);
    console.log(`RPC: ${config.rpcUrl}`);
    console.log(`Poll interval: ${config.pollIntervalMs}ms`);
    console.log(`Auto-burn LP: ${config.autoBurnLp}`);

    this.isRunning = true;

    // Initial check
    await this.checkForCompletedCurves();

    // Poll periodically
    while (this.isRunning) {
      await this.sleep(config.pollIntervalMs);
      await this.checkForCompletedCurves();
    }
  }

  /**
   * Stop the watcher
   */
  stop(): void {
    console.log('Stopping Curve Watcher...');
    this.isRunning = false;
  }

  /**
   * Check for completed curves that need migration
   */
  private async checkForCompletedCurves(): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Checking for completed curves...`);

      // Fetch all bonding curve accounts
      const curves = await this.fetchAllCurves();

      // Filter for completed but not migrated curves
      const completedCurves = curves.filter(curve => {
        const curveKey = curve.publicKey.toBase58();

        // Skip if already processed
        if (this.processedCurves.has(curveKey)) {
          return false;
        }

        // Check if complete but not migrated
        return isCurveComplete(curve.account.status) && !isCurveMigrated(curve.account.status);
      });

      if (completedCurves.length === 0) {
        console.log('No completed curves found.');
        return;
      }

      console.log(`Found ${completedCurves.length} completed curve(s) ready for migration.`);

      // Process each completed curve
      for (const curve of completedCurves) {
        await this.processCurve(curve);
      }
    } catch (error) {
      console.error('Error checking for completed curves:', error);
    }
  }

  /**
   * Fetch all bonding curve accounts from the program
   */
  private async fetchAllCurves(): Promise<Array<{ publicKey: PublicKey; account: BondingCurve }>> {
    // Get all program accounts with the bonding curve discriminator
    // The discriminator is the first 8 bytes of the account data
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        // BondingCurve account size (approximately)
        { dataSize: 200 }, // Adjust based on actual account size
      ],
    });

    // Parse accounts (in production, use the IDL to deserialize properly)
    // For now, we'll use a simplified approach
    const curves: Array<{ publicKey: PublicKey; account: BondingCurve }> = [];

    for (const { pubkey, account } of accounts) {
      try {
        // This is a simplified check - in production use proper IDL deserialization
        // Check if this looks like a bonding curve account by seed derivation
        const data = account.data;

        // Skip if too small
        if (data.length < 100) continue;

        // For now, we'll need to use the actual program's account fetching
        // This is placeholder logic
        curves.push({
          publicKey: pubkey,
          account: {} as BondingCurve, // Would be properly deserialized
        });
      } catch (e) {
        // Not a bonding curve account
        continue;
      }
    }

    return curves;
  }

  /**
   * Process a completed curve - migrate to Raydium
   */
  private async processCurve(curve: { publicKey: PublicKey; account: BondingCurve }): Promise<void> {
    const curveKey = curve.publicKey.toBase58();
    console.log(`\nProcessing curve: ${curveKey}`);

    try {
      // Mark as being processed
      this.processedCurves.add(curveKey);

      // Get the meme account for token info
      const meme = await this.fetchMeme(curve.account.meme);
      if (!meme) {
        console.error(`Could not fetch meme account for curve ${curveKey}`);
        return;
      }

      const tokenName = decodeString(meme.name);
      const tokenSymbol = decodeString(meme.symbol);

      console.log(`Token: ${tokenName} ($${tokenSymbol})`);
      console.log(`Mint: ${curve.account.mint.toBase58()}`);
      console.log(`Real SOL reserves: ${curve.account.realSolReserves.toString()} lamports`);
      console.log(`Real token reserves: ${curve.account.realTokenReserves.toString()}`);

      // Perform migration
      const result = await migrateToRaydium({
        connection: this.connection,
        meme: curve.account.meme,
        mint: curve.account.mint,
        curvePublicKey: curve.publicKey,
        solAmount: curve.account.realSolReserves,
        tokenAmount: curve.account.realTokenReserves,
      });

      console.log(`Migration successful!`);
      console.log(`Pool ID: ${result.poolId.toBase58()}`);
      console.log(`Pool creation tx: ${result.createPoolTx}`);

      if (result.burnLpTx) {
        console.log(`LP burn tx: ${result.burnLpTx}`);
      }

    } catch (error) {
      console.error(`Failed to migrate curve ${curveKey}:`, error);
      // Remove from processed so it can be retried
      this.processedCurves.delete(curveKey);
    }
  }

  /**
   * Fetch meme account
   */
  private async fetchMeme(memePublicKey: PublicKey): Promise<Meme | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(memePublicKey);
      if (!accountInfo) return null;

      // Deserialize meme account (simplified - use IDL in production)
      // Return placeholder for now
      return {} as Meme;
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if executed directly
if (require.main === module) {
  const watcher = new CurveWatcher();

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down...');
    watcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    watcher.stop();
    process.exit(0);
  });

  watcher.start().catch(console.error);
}
