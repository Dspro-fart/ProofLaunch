import { CurveWatcher } from './watcher';
import { ProofOfMemeContract } from './contract';
import { migrateToRaydium } from './raydium';
import { config, getMigrationWallet, getConnection } from './config';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';

// Export all modules
export { CurveWatcher } from './watcher';
export { ProofOfMemeContract } from './contract';
export { migrateToRaydium, wrapSol, unwrapSol, sendLpToDeadAddress } from './raydium';
export * from './config';

/**
 * Main migration service entry point
 *
 * Usage:
 *   npm run watch      - Start the automatic watcher
 *   npm run dev        - Run once (for testing)
 */
async function main() {
  console.log('===========================================');
  console.log('  Proof of Meme - Raydium Migration Service');
  console.log('===========================================\n');

  // Validate configuration
  try {
    const wallet = getMigrationWallet();
    console.log(`Migration wallet: ${wallet.publicKey.toBase58()}`);

    const connection = getConnection();
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < config.minWalletBalanceSol * LAMPORTS_PER_SOL) {
      console.warn(`\nWARNING: Wallet balance is low. Minimum recommended: ${config.minWalletBalanceSol} SOL`);
    }
  } catch (error: any) {
    console.error('Configuration error:', error.message);
    console.log('\nPlease ensure you have set up your .env file correctly.');
    console.log('See .env.example for reference.');
    process.exit(1);
  }

  // Check for command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--migrate') && args.length >= 2) {
    // Manual migration mode
    const memeIndexArg = args[args.indexOf('--migrate') + 1];
    const memeIndex = parseInt(memeIndexArg);

    if (isNaN(memeIndex)) {
      console.error('Invalid meme index. Usage: npm run dev -- --migrate <meme_index>');
      process.exit(1);
    }

    await runManualMigration(memeIndex);
  } else if (args.includes('--check')) {
    // Check for completed curves
    await checkCompletedCurves();
  } else {
    // Default: start watcher
    console.log('\nStarting automatic migration watcher...');
    console.log('Press Ctrl+C to stop.\n');

    const watcher = new CurveWatcher();

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      watcher.stop();
      process.exit(0);
    });

    await watcher.start();
  }
}

/**
 * Manually trigger migration for a specific meme
 */
async function runManualMigration(memeIndex: number) {
  console.log(`\nManual migration for meme index: ${memeIndex}`);

  const contract = new ProofOfMemeContract();
  const connection = getConnection();
  const wallet = getMigrationWallet();

  // Fetch meme data
  const meme = await contract.getMeme(memeIndex);
  if (!meme) {
    console.error('Meme not found');
    process.exit(1);
  }

  console.log(`Meme: ${meme.name} ($${meme.symbol})`);
  console.log(`Status: ${meme.status}`);

  if (meme.status !== 'launched') {
    console.error('Meme must be in "launched" status to migrate');
    process.exit(1);
  }

  // Fetch curve data
  const curve = await contract.getCurve(meme.publicKey);
  if (!curve) {
    console.error('Curve not found');
    process.exit(1);
  }

  console.log(`Curve status: ${curve.status}`);
  console.log(`Real SOL reserves: ${curve.realSolReserves.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`Real token reserves: ${curve.realTokenReserves.toString()}`);

  if (curve.status !== 'complete') {
    console.error('Curve must be "complete" to migrate');
    process.exit(1);
  }

  // Confirm migration
  console.log('\nThis will:');
  console.log('1. Create a Raydium CPMM pool');
  console.log('2. Add liquidity from the bonding curve');
  console.log('3. Burn LP tokens to make liquidity permanent');
  console.log('\nProceeding with migration...');

  try {
    const result = await migrateToRaydium({
      connection,
      meme: meme.publicKey,
      mint: meme.mint,
      curvePublicKey: curve.publicKey,
      solAmount: curve.realSolReserves,
      tokenAmount: curve.realTokenReserves,
    });

    console.log('\n✅ Migration successful!');
    console.log(`Pool ID: ${result.poolId.toBase58()}`);
    console.log(`LP Mint: ${result.lpMint.toBase58()}`);
    console.log(`Create Pool TX: ${result.createPoolTx}`);
    if (result.burnLpTx) {
      console.log(`Burn LP TX: ${result.burnLpTx}`);
    }

    // Mark as migrated on-chain
    console.log('\nMarking curve as migrated on-chain...');
    const migrateTx = await contract.markCurveMigrated(memeIndex);
    console.log(`Migrate TX: ${migrateTx}`);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check for completed curves without migrating
 */
async function checkCompletedCurves() {
  console.log('\nChecking for completed curves...\n');

  const contract = new ProofOfMemeContract();
  const curves = await contract.getCompletedCurves();

  if (curves.length === 0) {
    console.log('No completed curves found.');
    return;
  }

  console.log(`Found ${curves.length} completed curve(s):\n`);

  for (const curve of curves) {
    console.log(`Curve: ${curve.publicKey.toBase58()}`);
    console.log(`  Meme: ${curve.meme.toBase58()}`);
    console.log(`  Mint: ${curve.mint.toBase58()}`);
    console.log(`  Status: ${curve.status}`);
    console.log(`  Real SOL: ${curve.realSolReserves.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Real Tokens: ${curve.realTokenReserves.toString()}`);
    console.log('');
  }

  console.log('To migrate a specific meme, run:');
  console.log('  npm run dev -- --migrate <meme_index>');
}

// Run main
main().catch(console.error);
