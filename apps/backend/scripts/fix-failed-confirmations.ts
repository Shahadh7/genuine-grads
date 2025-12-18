#!/usr/bin/env tsx
/**
 * Fix certificates that were successfully minted on-chain
 * but the database confirmation failed
 *
 * Usage: npx tsx scripts/fix-failed-confirmations.ts <universityId>
 */

import { sharedDb } from '../src/db/shared.client.js';
import { getUniversityDb } from '../src/db/university.client.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { getAssetWithProof } from '@metaplex-foundation/mpl-bubblegum';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function getCNFTDetailsFromTransaction(
  signature: string,
  merkleTreeAddress: string,
  studentWallet: string
): Promise<{ assetId: string; leafIndex: bigint } | null> {
  try {
    const umi = createUmi(SOLANA_RPC_URL);
    const merkleTree = publicKey(merkleTreeAddress);
    const owner = publicKey(studentWallet);

    // Find the asset by owner
    const assets = await umi.rpc.getAssetsByOwner({ owner });

    // Find asset from this merkle tree
    const asset = assets.items.find((a: any) =>
      a.compression?.tree === merkleTree
    );

    if (asset) {
      // Get asset with proof to extract leaf index
      const assetWithProof = await getAssetWithProof(umi, asset.id);

      return {
        assetId: asset.id.toString(),
        leafIndex: BigInt(assetWithProof.leafIndex || 0),
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to extract cNFT details:', error);
    return null;
  }
}

async function fixFailedConfirmations(universityId: string) {
  console.log(`\n🔧 Fixing failed confirmations for university: ${universityId}\n`);

  try {
    // Get university
    const university = await sharedDb.university.findUnique({
      where: { id: universityId },
      select: {
        id: true,
        name: true,
        databaseUrl: true,
        merkleTreeAddress: true,
      },
    });

    if (!university) {
      console.error('❌ University not found');
      process.exit(1);
    }

    if (!university.databaseUrl) {
      console.error('❌ University database URL not configured');
      process.exit(1);
    }

    console.log(`University: ${university.name}`);
    console.log(`Merkle Tree: ${university.merkleTreeAddress || 'Not configured'}\n`);

    // Connect to university database
    const uniDb = await getUniversityDb(university.databaseUrl);

    // Find certificates with transaction signatures but PENDING status
    const pendingCerts = await uniDb.certificate.findMany({
      where: {
        status: 'PENDING',
        transactionSignature: {
          not: null,
        },
      },
      include: {
        student: {
          select: {
            walletAddress: true,
            fullName: true,
          },
        },
      },
    });

    if (pendingCerts.length === 0) {
      console.log('✅ No certificates need fixing');
      return;
    }

    console.log(`Found ${pendingCerts.length} certificate(s) to fix:\n`);

    let successCount = 0;
    let failCount = 0;

    // Process each certificate
    for (const cert of pendingCerts) {
      console.log(`Processing: ${cert.certificateNumber}`);
      console.log(`  Student: ${cert.student.fullName}`);
      console.log(`  Tx Signature: ${cert.transactionSignature}`);

      try {
        const updateData: any = {
          status: 'MINTED',
        };

        // Try to extract cNFT details if merkle tree is available
        if (university.merkleTreeAddress && cert.student.walletAddress) {
          const cnftDetails = await getCNFTDetailsFromTransaction(
            cert.transactionSignature!,
            university.merkleTreeAddress,
            cert.student.walletAddress
          );

          if (cnftDetails) {
            updateData.mintAddress = cnftDetails.assetId;
            updateData.leafIndex = cnftDetails.leafIndex;
            console.log(`  ✓ Found cNFT: ${cnftDetails.assetId}`);
            console.log(`  ✓ Leaf Index: ${cnftDetails.leafIndex}`);
          } else {
            console.log(`  ⚠️  Could not extract cNFT details`);
          }
        }

        // Update certificate
        await uniDb.certificate.update({
          where: { id: cert.id },
          data: updateData,
        });

        console.log(`  ✅ Updated to MINTED status\n`);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ Failed to update: ${error.message}\n`);
        failCount++;
      }
    }

    console.log('═'.repeat(60));
    console.log('📊 Summary:');
    console.log(`✅ Successfully fixed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('═'.repeat(60));

  } catch (error: any) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await sharedDb.$disconnect();
  }
}

// Get university ID from command line
const universityId = process.argv[2];

if (!universityId) {
  console.error('Usage: npx tsx scripts/fix-failed-confirmations.ts <universityId>');
  process.exit(1);
}

fixFailedConfirmations(universityId);
