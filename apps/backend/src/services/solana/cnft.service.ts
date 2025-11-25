import { connection } from './program.service.js';
import { helius } from '../helius/helius.client.js';
import { logger } from '../../utils/logger.js';

/**
 * Get the most recently minted cNFT for a recipient from a specific tree
 * Uses Helius DAS API to find the asset
 */
async function getRecentlyMintedAsset(
  recipientAddress: string,
  merkleTreeAddress: string,
  maxRetries: number = 5,
  retryDelay: number = 2000
): Promise<{ assetId: string; leafIndex: number } | null> {
  try {
    // Retry loop to account for indexing delay
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(
          { recipientAddress, merkleTreeAddress, attempt: attempt + 1 },
          'Querying Helius DAS for recently minted asset'
        );

        // Get all compressed assets owned by the recipient
        const response = await helius.rpc.getAssetsByOwner({
          ownerAddress: recipientAddress,
          page: 1,
          limit: 100,
        });

        const assets = response.items || [];

        // Find assets from the specific merkle tree
        const matchingAssets = assets.filter((asset: any) => {
          return (
            asset.compression?.compressed === true &&
            asset.compression?.tree === merkleTreeAddress &&
            !asset.burnt
          );
        });

        if (matchingAssets.length > 0) {
          // Sort by most recent (assuming the API returns them in order, or we can sort by slot)
          // Get the most recently minted one
          const mostRecent = matchingAssets[0];

          const assetId = mostRecent.id;
          const leafIndex = mostRecent.compression?.leaf_id ?? null;

          if (assetId && leafIndex !== null) {
            logger.info(
              { assetId, leafIndex, recipientAddress, merkleTreeAddress },
              'Found recently minted cNFT via Helius DAS'
            );

            return { assetId, leafIndex };
          }
        }

        // If not found yet, wait and retry (indexing might be delayed)
        if (attempt < maxRetries - 1) {
          logger.info(
            { attempt: attempt + 1, retryDelay },
            'Asset not yet indexed, waiting before retry'
          );
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (err: any) {
        logger.warn({ error: err.message, attempt: attempt + 1 }, 'Error querying Helius DAS');
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    logger.warn(
      { recipientAddress, merkleTreeAddress, maxRetries },
      'Could not find recently minted asset after retries'
    );
    return null;
  } catch (error: any) {
    logger.error(
      { error: error.message, recipientAddress, merkleTreeAddress },
      'Failed to get recently minted asset'
    );
    return null;
  }
}

/**
 * Get compressed NFT details from transaction using Helius DAS API
 * Returns the asset information needed to update the database
 */
export async function getCNFTDetailsFromTransaction(
  signature: string,
  merkleTreeAddress: string,
  recipientAddress?: string
): Promise<{
  assetId: string;
  leafIndex: number;
} | null> {
  try {
    // First, try to get the transaction to extract the recipient if not provided
    if (!recipientAddress) {
      const transaction = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!transaction || !transaction.meta) {
        logger.warn({ signature }, 'Transaction not found or no metadata');
        return null;
      }

      // Extract recipient from transaction accounts
      // This depends on the instruction structure, but typically the recipient is in the accounts
      const accountKeys = transaction.transaction.message.getAccountKeys();

      // The recipient is typically one of the accounts in the instruction
      // For now, we'll try to get it from the instruction accounts
      // This is a simplified approach - you might need to adjust based on your exact instruction format
      if (accountKeys.length > 1) {
        recipientAddress = accountKeys.get(1)?.toBase58();
      }
    }

    if (!recipientAddress) {
      logger.warn({ signature }, 'Could not determine recipient address');
      return null;
    }

    // Use Helius DAS API to find the recently minted asset
    const result = await getRecentlyMintedAsset(recipientAddress, merkleTreeAddress);

    if (!result) {
      logger.warn(
        { signature, recipientAddress, merkleTreeAddress },
        'Could not find cNFT via Helius DAS API'
      );
      return null;
    }

    return result;
  } catch (error: any) {
    logger.error({ error: error.message, signature }, 'Failed to get cNFT details from transaction');
    return null;
  }
}

/**
 * Verify that a compressed NFT exists using Helius DAS API
 */
export async function verifyCNFTExists(assetId: string): Promise<boolean> {
  try {
    const asset = await helius.rpc.getAsset({ id: assetId });

    if (!asset) {
      logger.warn({ assetId }, 'Asset not found via Helius DAS');
      return false;
    }

    // Check if asset is compressed and not burned
    const exists = asset.compression?.compressed === true && !asset.burnt;

    logger.info({ assetId, exists }, 'Verified cNFT existence via Helius DAS');
    return exists;
  } catch (error: any) {
    logger.error({ error: error.message, assetId }, 'Failed to verify cNFT');
    return false;
  }
}

/**
 * Get detailed asset information from Helius DAS API
 */
export async function getCNFTAssetInfo(assetId: string): Promise<any> {
  try {
    const asset = await helius.rpc.getAsset({ id: assetId });

    logger.info({ assetId, compressed: asset?.compression?.compressed }, 'Retrieved cNFT asset info');

    return asset;
  } catch (error: any) {
    logger.error({ error: error.message, assetId }, 'Failed to get cNFT asset info');
    return null;
  }
}
