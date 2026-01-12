import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Connection, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

// Re-export types
export * from './types';
export * from './pda';
export * from './constants';
export * from './metadata';

import {
  getPlatformPDA,
  getMemePDA,
  getBackingPDA,
  getVaultPDA,
  getCurvePDA,
  getCurveVaultPDA,
  getGenesisPoolPDA,
  getMintPDA
} from './pda';
import { PROGRAM_ID, LAMPORTS_PER_SOL, BPS_DENOMINATOR } from './constants';
import { createTokenMetadata, SocialLinks, getMetadataPDA } from './metadata';

export interface ProofOfMemeSDKConfig {
  connection: Connection;
  wallet: AnchorProvider['wallet'];
  programId?: PublicKey;
}

export interface SubmitMemeParams {
  name: string;
  symbol: string;
  uri: string;
  description: string;
  solGoal: number; // in SOL
  minBackers: number;
  durationSeconds: number;
}

export interface MemeInfo {
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
  status: string;
  createdAt: BN;
  launchedAt: BN;
  creatorBacking: BN;
  index: BN;
}

export interface BackingInfo {
  publicKey: PublicKey;
  backer: PublicKey;
  meme: PublicKey;
  amount: BN;
  qualifiesForFees: boolean;
  backedAt: BN;
  withdrawn: boolean;
  tokensReceived: BN;
  feesClaimed: BN;
  genesisShareBps: number;
}

export interface CurveInfo {
  publicKey: PublicKey;
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
  status: string;
  completionThreshold: BN;
}

export interface ProofOfMemeSDKConfigWithIdl extends ProofOfMemeSDKConfig {
  idl: Idl;
}

export class ProofOfMemeSDK {
  public program: Program;
  public provider: AnchorProvider;
  public programId: PublicKey;

  constructor(config: ProofOfMemeSDKConfigWithIdl) {
    this.programId = config.programId || PROGRAM_ID;
    this.provider = new AnchorProvider(
      config.connection,
      config.wallet,
      AnchorProvider.defaultOptions()
    );

    // Initialize program with IDL
    this.program = new Program(config.idl, this.provider);
  }

  // Static method to create SDK without IDL for quote-only operations
  static createForQuotes(config: ProofOfMemeSDKConfig): ProofOfMemeSDK {
    return {
      programId: config.programId || PROGRAM_ID,
      provider: new AnchorProvider(
        config.connection,
        config.wallet,
        AnchorProvider.defaultOptions()
      ),
      program: null as any,
    } as ProofOfMemeSDK;
  }

  // ============ Platform Methods ============

  async initializePlatform(
    submissionFee: number, // in SOL
    platformFeeBps: number,
    genesisFeeBps: number,
    burnFeeBps: number
  ): Promise<string> {
    const [platformPDA] = getPlatformPDA(this.programId);

    const tx = await this.program.methods
      .initializePlatform(
        new BN(submissionFee * LAMPORTS_PER_SOL),
        platformFeeBps,
        genesisFeeBps,
        burnFeeBps
      )
      .accounts({
        authority: this.provider.wallet.publicKey,
        platform: platformPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async getPlatformConfig(): Promise<any> {
    const [platformPDA] = getPlatformPDA(this.programId);
    return (this.program.account as any).platformConfig.fetch(platformPDA);
  }

  // ============ Meme Submission Methods ============

  async submitMeme(params: SubmitMemeParams): Promise<{ tx: string; memePDA: PublicKey }> {
    const platform = await this.getPlatformConfig();
    const [platformPDA] = getPlatformPDA(this.programId);
    const [memePDA] = getMemePDA(this.programId, platform.totalMemesSubmitted);
    const [vaultPDA] = getVaultPDA(this.programId, memePDA);

    const tx = await this.program.methods
      .submitMeme(
        params.name,
        params.symbol,
        params.uri,
        params.description,
        new BN(params.solGoal * LAMPORTS_PER_SOL),
        params.minBackers,
        new BN(params.durationSeconds)
      )
      .accounts({
        creator: this.provider.wallet.publicKey,
        platform: platformPDA,
        meme: memePDA,
        vault: vaultPDA,
        platformAuthority: platform.authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, memePDA };
  }

  async getMeme(memeIndex: number | BN): Promise<MemeInfo> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const meme = await (this.program.account as any).meme.fetch(memePDA);

    return {
      publicKey: memePDA,
      creator: meme.creator,
      mint: meme.mint,
      name: this.decodeString(meme.name),
      symbol: this.decodeString(meme.symbol),
      uri: this.decodeString(meme.uri),
      description: this.decodeString(meme.description),
      solGoal: meme.solGoal,
      solBacked: meme.solBacked,
      minBackers: meme.minBackers,
      backerCount: meme.backerCount,
      provingEndsAt: meme.provingEndsAt,
      status: this.decodeStatus(meme.status),
      createdAt: meme.createdAt,
      launchedAt: meme.launchedAt,
      creatorBacking: meme.creatorBacking,
      index: meme.index,
    };
  }

  async getAllMemes(): Promise<MemeInfo[]> {
    const memes = await (this.program.account as any).meme.all();
    return memes.map((m: any) => ({
      publicKey: m.publicKey,
      creator: m.account.creator,
      mint: m.account.mint,
      name: this.decodeString(m.account.name),
      symbol: this.decodeString(m.account.symbol),
      uri: this.decodeString(m.account.uri),
      description: this.decodeString(m.account.description),
      solGoal: m.account.solGoal,
      solBacked: m.account.solBacked,
      minBackers: m.account.minBackers,
      backerCount: m.account.backerCount,
      provingEndsAt: m.account.provingEndsAt,
      status: this.decodeStatus(m.account.status),
      createdAt: m.account.createdAt,
      launchedAt: m.account.launchedAt,
      creatorBacking: m.account.creatorBacking,
      index: m.account.index,
    }));
  }

  // ============ Backing Methods ============

  async backMeme(memeIndex: number | BN, amountSol: number): Promise<string> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [backingPDA] = getBackingPDA(this.programId, memePDA, this.provider.wallet.publicKey);
    const [vaultPDA] = getVaultPDA(this.programId, memePDA);

    const tx = await this.program.methods
      .backMeme(new BN(amountSol * LAMPORTS_PER_SOL))
      .accounts({
        backer: this.provider.wallet.publicKey,
        meme: memePDA,
        backing: backingPDA,
        vault: vaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async getBacking(memeIndex: number | BN, backer?: PublicKey): Promise<BackingInfo> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const backerKey = backer || this.provider.wallet.publicKey;
    const [backingPDA] = getBackingPDA(this.programId, memePDA, backerKey);

    const backing = await (this.program.account as any).backing.fetch(backingPDA);

    return {
      publicKey: backingPDA,
      backer: backing.backer,
      meme: backing.meme,
      amount: backing.amount,
      qualifiesForFees: backing.qualifiesForFees,
      backedAt: backing.backedAt,
      withdrawn: backing.withdrawn,
      tokensReceived: backing.tokensReceived,
      feesClaimed: backing.feesClaimed,
      genesisShareBps: backing.genesisShareBps,
    };
  }

  async withdrawBacking(memeIndex: number | BN): Promise<string> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [backingPDA] = getBackingPDA(this.programId, memePDA, this.provider.wallet.publicKey);
    const [vaultPDA] = getVaultPDA(this.programId, memePDA);

    const tx = await this.program.methods
      .withdrawBacking()
      .accounts({
        backer: this.provider.wallet.publicKey,
        meme: memePDA,
        backing: backingPDA,
        vault: vaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ============ Finalization Methods ============

  async finalizeProving(memeIndex: number | BN): Promise<string> {
    const [platformPDA] = getPlatformPDA(this.programId);
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [vaultPDA] = getVaultPDA(this.programId, memePDA);
    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, memePDA);
    const [genesisPoolPDA] = getGenesisPoolPDA(this.programId, memePDA);
    const [mintPDA] = getMintPDA(this.programId, memePDA);

    const curveTokenAccount = await getAssociatedTokenAddress(mintPDA, curvePDA, true);

    const tx = await this.program.methods
      .finalizeProving()
      .accounts({
        finalizer: this.provider.wallet.publicKey,
        platform: platformPDA,
        meme: memePDA,
        vault: vaultPDA,
        mint: mintPDA,
        curve: curvePDA,
        curveTokenAccount,
        genesisPool: genesisPoolPDA,
        curveVault: curveVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return tx;
  }

  /**
   * Finalize proving AND create Metaplex metadata for visibility on Axiom, Birdeye, etc.
   * This is the recommended method for launching tokens.
   *
   * @param memeIndex - The meme index to finalize
   * @param metadataUri - URI to the JSON metadata (uploaded to IPFS/Arweave)
   * @param payer - Keypair that will pay for metadata account rent (~0.01 SOL)
   * @returns Object with finalize tx hash and metadata tx hash
   */
  async finalizeProvingWithMetadata(
    memeIndex: number | BN,
    metadataUri: string,
    payer: Keypair
  ): Promise<{ finalizeTx: string; metadataTx: string; mint: PublicKey }> {
    // First, finalize proving to create the mint
    const finalizeTx = await this.finalizeProving(memeIndex);

    // Get meme data to extract name/symbol
    const memeInfo = await this.getMeme(memeIndex);
    const [mintPDA] = getMintPDA(this.programId, memeInfo.publicKey);

    // Create Metaplex metadata
    const metadataTx = await createTokenMetadata({
      connection: this.provider.connection,
      payer,
      mint: mintPDA,
      name: memeInfo.name,
      symbol: memeInfo.symbol,
      uri: metadataUri,
      updateAuthority: payer.publicKey,
      isMutable: true,
      sellerFeeBasisPoints: 0, // No royalties for meme coins
    });

    return { finalizeTx, metadataTx, mint: mintPDA };
  }

  /**
   * Create Metaplex metadata for an already-launched token
   * Use this if finalize was called without metadata, or to update metadata
   */
  async createMetadataForMeme(
    memeIndex: number | BN,
    metadataUri: string,
    payer: Keypair
  ): Promise<{ metadataTx: string; metadataPDA: PublicKey }> {
    const memeInfo = await this.getMeme(memeIndex);

    if (memeInfo.status !== 'launched' && memeInfo.status !== 'migrated') {
      throw new Error('Meme must be launched before creating metadata');
    }

    const [mintPDA] = getMintPDA(this.programId, memeInfo.publicKey);
    const metadataPDA = getMetadataPDA(mintPDA);

    const metadataTx = await createTokenMetadata({
      connection: this.provider.connection,
      payer,
      mint: mintPDA,
      name: memeInfo.name,
      symbol: memeInfo.symbol,
      uri: metadataUri,
      updateAuthority: payer.publicKey,
      isMutable: true,
      sellerFeeBasisPoints: 0,
    });

    return { metadataTx, metadataPDA };
  }

  async markMemeFailed(memeIndex: number | BN): Promise<string> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);

    const tx = await this.program.methods
      .markMemeFailed()
      .accounts({
        finalizer: this.provider.wallet.publicKey,
        meme: memePDA,
      })
      .rpc();

    return tx;
  }

  // ============ Trading Methods ============

  async buyTokens(memeIndex: number | BN, solAmount: number, minTokensOut: BN): Promise<string> {
    const platform = await this.getPlatformConfig();
    const [platformPDA] = getPlatformPDA(this.programId);
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const meme = await (this.program.account as any).meme.fetch(memePDA);

    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, memePDA);
    const [genesisPoolPDA] = getGenesisPoolPDA(this.programId, memePDA);

    const curveTokenAccount = await getAssociatedTokenAddress(meme.mint, curvePDA, true);
    const buyerTokenAccount = await getAssociatedTokenAddress(meme.mint, this.provider.wallet.publicKey);

    const tx = await this.program.methods
      .buyTokens(new BN(solAmount * LAMPORTS_PER_SOL), minTokensOut)
      .accounts({
        buyer: this.provider.wallet.publicKey,
        platform: platformPDA,
        meme: memePDA,
        curve: curvePDA,
        genesisPool: genesisPoolPDA,
        curveTokenAccount,
        buyerTokenAccount,
        curveVault: curveVaultPDA,
        platformAuthority: platform.authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async sellTokens(memeIndex: number | BN, tokenAmount: BN, minSolOut: number): Promise<string> {
    const platform = await this.getPlatformConfig();
    const [platformPDA] = getPlatformPDA(this.programId);
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const meme = await (this.program.account as any).meme.fetch(memePDA);

    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, memePDA);
    const [genesisPoolPDA] = getGenesisPoolPDA(this.programId, memePDA);

    const curveTokenAccount = await getAssociatedTokenAddress(meme.mint, curvePDA, true);
    const sellerTokenAccount = await getAssociatedTokenAddress(meme.mint, this.provider.wallet.publicKey);

    const tx = await this.program.methods
      .sellTokens(tokenAmount, new BN(minSolOut * LAMPORTS_PER_SOL))
      .accounts({
        seller: this.provider.wallet.publicKey,
        platform: platformPDA,
        meme: memePDA,
        curve: curvePDA,
        genesisPool: genesisPoolPDA,
        curveTokenAccount,
        sellerTokenAccount,
        curveVault: curveVaultPDA,
        platformAuthority: platform.authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async getCurve(memeIndex: number | BN): Promise<CurveInfo> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const curve = await (this.program.account as any).bondingCurve.fetch(curvePDA);

    return {
      publicKey: curvePDA,
      meme: curve.meme,
      mint: curve.mint,
      virtualSolReserves: curve.virtualSolReserves,
      virtualTokenReserves: curve.virtualTokenReserves,
      realSolReserves: curve.realSolReserves,
      realTokenReserves: curve.realTokenReserves,
      tokensSold: curve.tokensSold,
      totalVolume: curve.totalVolume,
      genesisFeesAccumulated: curve.genesisFeesAccumulated,
      genesisFeesDistributed: curve.genesisFeesDistributed,
      platformFeesAccumulated: curve.platformFeesAccumulated,
      burnFeesAccumulated: curve.burnFeesAccumulated,
      status: this.decodeCurveStatus(curve.status),
      completionThreshold: curve.completionThreshold,
    };
  }

  // ============ Genesis Fee Methods ============

  async claimGenesisFees(memeIndex: number | BN): Promise<string> {
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [backingPDA] = getBackingPDA(this.programId, memePDA, this.provider.wallet.publicKey);
    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, memePDA);
    const [genesisPoolPDA] = getGenesisPoolPDA(this.programId, memePDA);

    const tx = await this.program.methods
      .claimGenesisFees()
      .accounts({
        backer: this.provider.wallet.publicKey,
        meme: memePDA,
        backing: backingPDA,
        curve: curvePDA,
        genesisPool: genesisPoolPDA,
        curveVault: curveVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ============ Migration Methods ============

  async migrateToRaydium(memeIndex: number | BN): Promise<string> {
    const platform = await this.getPlatformConfig();
    const [platformPDA] = getPlatformPDA(this.programId);
    const [memePDA] = getMemePDA(this.programId, memeIndex);
    const [curvePDA] = getCurvePDA(this.programId, memePDA);
    const [curveVaultPDA] = getCurveVaultPDA(this.programId, memePDA);

    const tx = await this.program.methods
      .migrateToRaydium()
      .accounts({
        migrator: this.provider.wallet.publicKey,
        platform: platformPDA,
        meme: memePDA,
        curve: curvePDA,
        platformAuthority: platform.authority,
        curveVault: curveVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ============ Quote Methods (off-chain calculations) ============

  async quoteBuy(memeIndex: number | BN, solAmount: number): Promise<{ tokensOut: BN; fee: BN }> {
    const curve = await this.getCurve(memeIndex);
    const solIn = new BN(solAmount * LAMPORTS_PER_SOL);

    // Calculate trading fee (1%)
    const tradingFee = solIn.muln(100).divn(BPS_DENOMINATOR);
    const solAfterFee = solIn.sub(tradingFee);

    // Constant product formula: tokens_out = (sol_in * virtual_token_reserves) / (virtual_sol_reserves + sol_in)
    const numerator = solAfterFee.mul(curve.virtualTokenReserves);
    const denominator = curve.virtualSolReserves.add(solAfterFee);
    let tokensOut = numerator.div(denominator);

    // Cap at real reserves
    if (tokensOut.gt(curve.realTokenReserves)) {
      tokensOut = curve.realTokenReserves;
    }

    return { tokensOut, fee: tradingFee };
  }

  async quoteSell(memeIndex: number | BN, tokenAmount: BN): Promise<{ solOut: BN; fee: BN }> {
    const curve = await this.getCurve(memeIndex);

    // Constant product formula: sol_out = (token_in * virtual_sol_reserves) / (virtual_token_reserves + token_in)
    const numerator = tokenAmount.mul(curve.virtualSolReserves);
    const denominator = curve.virtualTokenReserves.add(tokenAmount);
    const solOutGross = numerator.div(denominator);

    // Calculate trading fee (1%)
    const tradingFee = solOutGross.muln(100).divn(BPS_DENOMINATOR);
    const solOutNet = solOutGross.sub(tradingFee);

    return { solOut: solOutNet, fee: tradingFee };
  }

  // ============ Helper Methods ============

  private decodeString(buffer: number[]): string {
    // Find the first zero byte (null terminator)
    let end = buffer.indexOf(0);
    if (end === -1) end = buffer.length;
    return Buffer.from(buffer.slice(0, end)).toString('utf8');
  }

  private decodeStatus(status: any): string {
    if (status.proving) return 'proving';
    if (status.launched) return 'launched';
    if (status.failed) return 'failed';
    if (status.migrated) return 'migrated';
    return 'unknown';
  }

  private decodeCurveStatus(status: any): string {
    if (status.active) return 'active';
    if (status.complete) return 'complete';
    if (status.migrated) return 'migrated';
    return 'unknown';
  }
}
