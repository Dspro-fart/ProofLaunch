import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createV1,
  mplTokenMetadata,
  TokenStandard,
  Collection,
  Uses,
  Creator
} from '@metaplex-foundation/mpl-token-metadata';
import {
  publicKey as umiPublicKey,
  createSignerFromKeypair,
  signerIdentity,
  percentAmount,
  Umi
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsPublicKey,
  toWeb3JsTransaction,
  fromWeb3JsKeypair
} from '@metaplex-foundation/umi-web3js-adapters';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';

/**
 * Token metadata for Metaplex standard
 * This structure is compatible with Axiom, Birdeye, DexScreener, etc.
 */
export interface TokenMetadataJson {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    category?: string;
    files?: Array<{
      uri: string;
      type: string;
    }>;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
  extensions?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };
}

/**
 * Social links for token metadata
 */
export interface SocialLinks {
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
}

/**
 * Build metadata JSON for token
 * This JSON should be uploaded to IPFS/Arweave and the URI used for metadata
 */
export function buildTokenMetadataJson(
  name: string,
  symbol: string,
  description: string,
  imageUri: string,
  socials?: SocialLinks,
  creatorAddress?: string
): TokenMetadataJson {
  const metadata: TokenMetadataJson = {
    name,
    symbol,
    description,
    image: imageUri,
    properties: {
      category: 'image',
      files: [
        {
          uri: imageUri,
          type: 'image/png'
        }
      ]
    }
  };

  // Add creator if provided
  if (creatorAddress) {
    metadata.properties!.creators = [
      {
        address: creatorAddress,
        share: 100
      }
    ];
  }

  // Add external URL (website)
  if (socials?.website) {
    metadata.external_url = socials.website;
  }

  // Add social extensions
  if (socials && Object.keys(socials).some(k => socials[k as keyof SocialLinks])) {
    metadata.extensions = {};

    if (socials.twitter) {
      // Normalize Twitter URL
      metadata.extensions.twitter = socials.twitter.startsWith('http')
        ? socials.twitter
        : `https://x.com/${socials.twitter.replace('@', '')}`;
    }

    if (socials.telegram) {
      // Normalize Telegram URL
      metadata.extensions.telegram = socials.telegram.startsWith('http')
        ? socials.telegram
        : `https://t.me/${socials.telegram.replace('@', '')}`;
    }

    if (socials.discord) {
      // Normalize Discord URL
      metadata.extensions.discord = socials.discord.startsWith('http')
        ? socials.discord
        : `https://discord.gg/${socials.discord}`;
    }

    if (socials.website) {
      metadata.extensions.website = socials.website.startsWith('http')
        ? socials.website
        : `https://${socials.website}`;
    }
  }

  return metadata;
}

/**
 * Create Metaplex metadata account for a token mint
 * This makes the token visible on Axiom, Birdeye, DexScreener, etc.
 */
export interface CreateMetadataParams {
  connection: Connection;
  payer: Keypair;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;  // URI to the JSON metadata (IPFS/Arweave)
  updateAuthority?: PublicKey;  // Who can update metadata, defaults to payer
  isMutable?: boolean;  // Can metadata be updated? Default true
  sellerFeeBasisPoints?: number;  // Royalty percentage in basis points (0 for meme coins)
}

export async function createTokenMetadata(params: CreateMetadataParams): Promise<string> {
  const {
    connection,
    payer,
    mint,
    name,
    symbol,
    uri,
    updateAuthority,
    isMutable = true,
    sellerFeeBasisPoints = 0,
  } = params;

  // Create UMI instance
  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());

  // Set up signer
  const umiKeypair = fromWeb3JsKeypair(payer);
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));

  // Convert mint to UMI public key
  const mintUmi = fromWeb3JsPublicKey(mint);
  const updateAuthorityUmi = updateAuthority
    ? fromWeb3JsPublicKey(updateAuthority)
    : signer.publicKey;

  // Create metadata
  const builder = createV1(umi, {
    mint: mintUmi,
    authority: signer,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints / 100),
    tokenStandard: TokenStandard.Fungible,
    isMutable,
  });

  // Send and confirm
  const result = await builder.sendAndConfirm(umi);

  // Convert signature to string
  return Buffer.from(result.signature).toString('base64');
}

/**
 * Get the metadata PDA for a mint
 */
export function getMetadataPDA(mint: PublicKey): PublicKey {
  const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  return metadataPDA;
}

/**
 * Check if metadata exists for a mint
 */
export async function hasMetadata(connection: Connection, mint: PublicKey): Promise<boolean> {
  const metadataPDA = getMetadataPDA(mint);
  const accountInfo = await connection.getAccountInfo(metadataPDA);
  return accountInfo !== null;
}
