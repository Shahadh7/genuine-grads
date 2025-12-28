import { sharedDb } from '../../db/shared.client.js';
import { getUniversityDb } from '../../db/university.client.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

interface HeliusWebhookPayload {
  signature: string;
  type: 'NFT_MINT' | 'NFT_BURN' | 'NFT_TRANSFER';
  timestamp: number;
  nftData?: {
    mint: string;
    owner: string;
  };
}

/**
 * Verify Helius webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process Helius webhook for certificate minting
 */
export async function processWebhook(payload: HeliusWebhookPayload): Promise<void> {
  try {
    logger.info({ payload }, 'Processing Helius webhook');

    // Log webhook
    await sharedDb.webhookLog.create({
      data: {
        webhookType: payload.type,
        signature: payload.signature,
        mintAddress: payload.nftData?.mint,
        payload: JSON.stringify(payload),
        processed: false,
      },
    });

    // Process based on type
    if (payload.type === 'NFT_MINT' && payload.nftData) {
      await handleMintEvent(payload);
    } else if (payload.type === 'NFT_BURN' && payload.nftData) {
      await handleBurnEvent(payload);
    } else if (payload.type === 'NFT_TRANSFER' && payload.nftData) {
      await handleTransferEvent(payload);
    }

    // Mark as processed
    await sharedDb.webhookLog.updateMany({
      where: { signature: payload.signature },
      data: { processed: true, processedAt: new Date() },
    });

    logger.info({ signature: payload.signature }, 'Webhook processed successfully');
  } catch (error: any) {
    logger.error({ error: error.message, payload }, 'Failed to process webhook');
    throw error;
  }
}

async function handleMintEvent(payload: HeliusWebhookPayload): Promise<void> {
  if (!payload.nftData) return;

  const { mint, owner } = payload.nftData;

  // Find certificate by mint address in mint activity log
  const mintLog = await sharedDb.mintActivityLog.findUnique({
    where: { mintAddress: mint },
  });

  if (mintLog) {
    // Update status to success
    await sharedDb.mintActivityLog.update({
      where: { id: mintLog.id },
      data: {
        status: 'SUCCESS',
        confirmedAt: new Date(),
        transactionSignature: payload.signature,
      },
    });

    // Also update in university database
    const university = await sharedDb.university.findUnique({
      where: { id: mintLog.universityId },
    });

    if (university?.databaseUrl) {
      const universityDb = await getUniversityDb(university.databaseUrl);
      
      await universityDb.certificate.updateMany({
        where: { mintAddress: mint },
        data: {
          status: 'MINTED',
          transactionSignature: payload.signature,
        },
      });
    }

    logger.info({ mint, owner }, 'Certificate mint confirmed via webhook');
  }
}

async function handleBurnEvent(payload: HeliusWebhookPayload): Promise<void> {
  if (!payload.nftData) return;

  const { mint } = payload.nftData;

  // Check if certificate was revoked
  const revoked = await sharedDb.revokedCertIndex.findUnique({
    where: { mintAddress: mint },
  });

  if (!revoked) {
    // Create revocation record if not already exists
    // This handles external burns
    logger.warn({ mint }, 'Certificate burned externally (not through our system)');
  }
}

async function handleTransferEvent(payload: HeliusWebhookPayload): Promise<void> {
  if (!payload.nftData) return;

  const { mint, owner } = payload.nftData;

  // Log the transfer
  logger.info({ mint, newOwner: owner }, 'Certificate transferred to new owner');
  
  // Note: Certificates should be non-transferable, so this shouldn't happen
  // If it does, we might want to flag it for review
}

/**
 * Setup Helius webhook programmatically
 */
export async function setupHeliusWebhook(
  heliusApiKey: string,
  webhookUrl: string,
  accountAddresses: string[]
): Promise<void> {
  try {
    const response = await fetch('https://api.helius.xyz/v0/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: heliusApiKey,
        webhookURL: webhookUrl,
        transactionTypes: ['NFT_MINT', 'NFT_BURN', 'NFT_TRANSFER'],
        accountAddresses,
        webhookType: 'enhanced',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to setup webhook: ${response.statusText}`);
    }

    const data = await response.json() as { webhookID: string };
    logger.info({ webhookId: data.webhookID }, 'Helius webhook setup successfully');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to setup Helius webhook');
    throw error;
  }
}

