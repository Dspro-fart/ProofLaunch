import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  PLATFORM_SEED,
  MEME_SEED,
  BACKING_SEED,
  VAULT_SEED,
  CURVE_SEED,
  GENESIS_POOL_SEED,
  CURVE_VAULT_SEED,
  MINT_SEED
} from './constants';

export function getPlatformPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_SEED],
    programId
  );
}

export function getMemePDA(programId: PublicKey, index: number | BN): [PublicKey, number] {
  const indexBN = typeof index === 'number' ? new BN(index) : index;
  return PublicKey.findProgramAddressSync(
    [MEME_SEED, indexBN.toArrayLike(Buffer, 'le', 8)],
    programId
  );
}

export function getBackingPDA(
  programId: PublicKey,
  memePDA: PublicKey,
  backer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BACKING_SEED, memePDA.toBuffer(), backer.toBuffer()],
    programId
  );
}

export function getVaultPDA(programId: PublicKey, memePDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, memePDA.toBuffer()],
    programId
  );
}

export function getCurvePDA(programId: PublicKey, memePDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CURVE_SEED, memePDA.toBuffer()],
    programId
  );
}

export function getCurveVaultPDA(programId: PublicKey, memePDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CURVE_VAULT_SEED, memePDA.toBuffer()],
    programId
  );
}

export function getGenesisPoolPDA(programId: PublicKey, memePDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [GENESIS_POOL_SEED, memePDA.toBuffer()],
    programId
  );
}

export function getMintPDA(programId: PublicKey, memePDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MINT_SEED, memePDA.toBuffer()],
    programId
  );
}
