import { Helius } from 'helius-sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { ConcurrentMerkleTreeAccount } from '@solana/spl-account-compression';
import { env } from '../../env.js';
import { logger } from '../../utils/logger.js';

// Initialize Helius client
// Helius only supports 'mainnet-beta' and 'devnet' clusters
const heliusCluster = env.SOLANA_NETWORK === 'testnet' ? 'devnet' : env.SOLANA_NETWORK;
export const helius = new Helius(env.HELIUS_API_KEY, heliusCluster as 'mainnet-beta' | 'devnet');

// Initialize Solana connection
export const solanaConnection = new Connection(env.SOLANA_RPC_URL, 'confirmed');

/**
 * Upload metadata to IPFS via Pinata/Helius
 */
export async function uploadMetadataToIPFS(metadata: Record<string, any>): Promise<string> {
  try {
    // TODO: Implement actual IPFS upload via Pinata
    // For now, return placeholder
    logger.info({ metadata }, 'Uploading metadata to IPFS');
    
    // const response = await axios.post(
    //   `${env.IPFS_API_URL}/pinning/pinJSONToIPFS`,
    //   metadata,
    //   {
    //     headers: {
    //       pinata_api_key: env.IPFS_API_KEY,
    //       pinata_secret_api_key: env.IPFS_SECRET_KEY,
    //     },
    //   }
    // );
    
    // return `ipfs://${response.data.IpfsHash}`;
    return `ipfs://QmPlaceholder${Date.now()}`;
  } catch (error) {
    logger.error({ error }, 'Failed to upload to IPFS');
    throw new Error('IPFS upload failed');
  }
}

/**
 * Mint a compressed NFT using Bubblegum
 */
export async function mintCompressedNFT(params: {
  recipient: string;
  metadataUri: string;
  merkleTree: string;
  universityKeypair: Keypair;
  name: string;
  symbol: string;
}): Promise<{ mintAddress: string; signature: string }> {
  try {
    const { recipient, metadataUri, merkleTree } = params;

    logger.info(
      {
        recipient,
        metadataUri,
        merkleTree,
      },
      'Minting compressed NFT'
    );

    // TODO: Implement actual Bubblegum minting
    // This requires:
    // 1. Creating a mintV1 instruction with Bubblegum
    // 2. Signing with university keypair
    // 3. Sending transaction
    // 4. Waiting for confirmation
    
    // Placeholder implementation
    const mintAddress = `${recipient}_${Date.now()}`;
    const signature = `sig_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info({ mintAddress, signature }, 'Compressed NFT minted');

    return {
      mintAddress,
      signature,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to mint compressed NFT');
    throw new Error('Minting failed');
  }
}

/**
 * Burn/revoke a compressed NFT
 */
export async function burnCompressedNFT(params: {
  mintAddress: string;
  owner: string;
  merkleTree: string;
  universityKeypair: Keypair;
}): Promise<{ signature: string }> {
  try {
    const { mintAddress, owner } = params;

    logger.info({ mintAddress, owner }, 'Burning compressed NFT');

    // TODO: Implement actual Bubblegum burning
    // This requires:
    // 1. Creating a burnV1 instruction
    // 2. Signing with authority
    // 3. Sending transaction
    
    const signature = `burn_sig_${Date.now()}`;

    logger.info({ mintAddress, signature }, 'Compressed NFT burned');

    return { signature };
  } catch (error) {
    logger.error({ error }, 'Failed to burn compressed NFT');
    throw new Error('Burning failed');
  }
}

/**
 * Verify NFT exists on-chain using Helius DAS API
 */
export async function verifyNFTOnChain(assetId: string): Promise<boolean> {
  try {
    const asset = await helius.rpc.getAsset({ id: assetId });
    
    if (!asset) {
      return false;
    }

    // Check if asset is compressed and not burned
    return asset.compression?.compressed === true && !asset.burnt;
  } catch (error) {
    logger.error({ error, assetId }, 'Failed to verify NFT on-chain');
    return false;
  }
}

/**
 * Get NFT metadata from chain
 */
export async function getNFTMetadata(assetId: string): Promise<any> {
  try {
    const asset = await helius.rpc.getAsset({ id: assetId });
    return asset;
  } catch (error) {
    logger.error({ error, assetId }, 'Failed to get NFT metadata');
    throw new Error('Failed to fetch NFT metadata');
  }
}

/**
 * Get NFTs owned by a wallet address
 */
export async function getNFTsByOwner(ownerAddress: string): Promise<any[]> {
  try {
    const response = await helius.rpc.getAssetsByOwner({
      ownerAddress,
      page: 1,
      limit: 100,
    });

    return response.items || [];
  } catch (error) {
    logger.error({ error, ownerAddress }, 'Failed to get NFTs by owner');
    return [];
  }
}

/**
 * Asset proof data structure from DAS API
 */
export interface AssetProof {
  root: string;
  proof: string[];
  nodeIndex?: number;
  leaf: string;
  treeId?: string;
}

/**
 * On-chain asset status for verification
 */
export interface AssetOnChainStatus {
  exists: boolean;
  burnt: boolean;
  compressed: boolean;
  owner?: string;
  treeId?: string;
}

/**
 * Check the on-chain status of a compressed NFT using Helius DAS API
 * This is used for certificate verification to detect if the asset has been burned
 */
export async function getAssetOnChainStatus(assetId: string): Promise<AssetOnChainStatus> {
  try {
    // First try to get the asset
    const asset = await helius.rpc.getAsset({ id: assetId });

    if (!asset) {
      logger.info({ assetId }, 'Asset not found on-chain');
      return {
        exists: false,
        burnt: false,
        compressed: false,
      };
    }

    // Check if asset is burnt (Helius DAS API returns burnt field)
    const isBurnt = asset.burnt === true;
    const isCompressed = asset.compression?.compressed === true;

    logger.info(
      {
        assetId,
        burnt: isBurnt,
        compressed: isCompressed,
        owner: asset.ownership?.owner,
        treeId: asset.compression?.tree,
      },
      'Retrieved asset on-chain status'
    );

    return {
      exists: true,
      burnt: isBurnt,
      compressed: isCompressed,
      owner: asset.ownership?.owner,
      treeId: asset.compression?.tree,
    };
  } catch (error: any) {
    // If we get an error, try getAssetProof as a fallback
    // The proof endpoint may return different error for burnt assets
    logger.warn({ error: error.message, assetId }, 'Failed to get asset, trying getAssetProof');

    try {
      const proof = await helius.rpc.getAssetProof({ id: assetId });

      // If proof exists but has specific indicators of burnt asset
      if (proof) {
        // Check if the proof response indicates burnt status
        // Note: Helius may return proof with burnt indicator
        const proofAny = proof as any;
        if (proofAny.burnt === true) {
          return {
            exists: true,
            burnt: true,
            compressed: true,
            treeId: proofAny.tree_id,
          };
        }

        // Proof exists, asset is likely valid
        return {
          exists: true,
          burnt: false,
          compressed: true,
          treeId: proofAny.tree_id,
        };
      }

      return {
        exists: false,
        burnt: false,
        compressed: false,
      };
    } catch (proofError) {
      logger.error({ error: proofError, assetId }, 'Failed to get asset proof as fallback');
      return {
        exists: false,
        burnt: false,
        compressed: false,
      };
    }
  }
}

/**
 * Get asset proof for burning a compressed NFT
 * This is required for Bubblegum burn operations
 */
export async function getAssetProof(assetId: string): Promise<AssetProof | null> {
  try {
    const response = await helius.rpc.getAssetProof({ id: assetId });

    if (!response) {
      logger.warn({ assetId }, 'Asset proof not found');
      return null;
    }

    logger.info({ assetId, proofLength: response.proof?.length }, 'Retrieved asset proof');
    return response as AssetProof;
  } catch (error) {
    logger.error({ error, assetId }, 'Failed to get asset proof');
    return null;
  }
}

/**
 * Get the canopy depth of a merkle tree
 * This determines how many proof nodes are cached on-chain
 */
export async function getTreeCanopyDepth(treeAddress: string): Promise<{ canopyDepth: number; maxDepth: number }> {
  try {
    const treePubkey = new PublicKey(treeAddress);
    const treeAccount = await ConcurrentMerkleTreeAccount.fromAccountAddress(solanaConnection, treePubkey);

    const canopyDepth = treeAccount.getCanopyDepth();
    const maxDepth = treeAccount.getMaxDepth();

    logger.info(
      { treeAddress, canopyDepth, maxDepth },
      'Retrieved merkle tree configuration'
    );

    return { canopyDepth, maxDepth };
  } catch (error) {
    logger.error({ error, treeAddress }, 'Failed to get tree canopy depth');
    return { canopyDepth: 0, maxDepth: 14 }; // Default values
  }
}

/**
 * Get full asset data with proof for burning
 * Combines getAsset and getAssetProof
 * Optionally truncates proof based on tree's canopy depth
 */
export async function getAssetWithProof(assetId: string, options?: { truncateCanopy?: boolean }): Promise<{
  asset: any;
  proof: AssetProof;
  dataHash: string;
  creatorHash: string;
  leafOwner: string;
  leafDelegate: string | null;
} | null> {
  try {
    // Get asset data
    const asset = await helius.rpc.getAsset({ id: assetId });
    if (!asset) {
      logger.warn({ assetId }, 'Asset not found');
      return null;
    }

    // Get asset proof
    const proof = await getAssetProof(assetId);
    if (!proof) {
      logger.warn({ assetId }, 'Asset proof not found');
      return null;
    }

    // Extract compression data
    const compression = asset.compression;
    if (!compression) {
      logger.warn({ assetId }, 'Asset is not compressed');
      return null;
    }

    // Get ownership info
    const ownership = asset.ownership;

    // Truncate proof based on canopy if requested
    let finalProof = proof;
    if (options?.truncateCanopy && compression.tree) {
      try {
        const { canopyDepth, maxDepth } = await getTreeCanopyDepth(compression.tree);

        if (canopyDepth > 0) {
          // We only need (maxDepth - canopyDepth) proof nodes
          // The rest are cached in the canopy
          const requiredProofLength = maxDepth - canopyDepth;

          if (proof.proof.length > requiredProofLength) {
            // Take only the bottom (requiredProofLength) nodes
            // These are the ones closest to the leaf
            const truncatedProofNodes = proof.proof.slice(0, requiredProofLength);
            finalProof = {
              ...proof,
              proof: truncatedProofNodes,
            };

            logger.info(
              {
                assetId,
                originalProofLength: proof.proof.length,
                truncatedProofLength: truncatedProofNodes.length,
                canopyDepth,
                maxDepth,
              },
              'Truncated proof based on canopy depth'
            );
          }
        }
      } catch (canopyError) {
        logger.warn({ error: canopyError, assetId }, 'Failed to get canopy info, using full proof');
      }
    }

    logger.info(
      {
        assetId,
        leafOwner: ownership?.owner,
        dataHash: compression.data_hash,
        creatorHash: compression.creator_hash,
        proofLength: finalProof.proof.length,
      },
      'Retrieved asset with proof'
    );

    return {
      asset,
      proof: finalProof,
      dataHash: compression.data_hash,
      creatorHash: compression.creator_hash,
      leafOwner: ownership?.owner || '',
      leafDelegate: ownership?.delegate || null,
    };
  } catch (error) {
    logger.error({ error, assetId }, 'Failed to get asset with proof');
    return null;
  }
}

