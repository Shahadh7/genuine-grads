/**
 * Encrypt Database URLs Migration Script
 *
 * This script encrypts all plain-text database URLs in the University table
 * using the MASTER_ENCRYPTION_KEY.
 *
 * IMPORTANT: Run this script ONCE after deploying the encryption changes.
 * It handles both encrypted and unencrypted URLs (idempotent).
 *
 * Usage:
 *   npx tsx scripts/encrypt-database-urls.ts
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --force      Skip confirmation prompt
 */

import { sharedDb } from '../src/db/shared.client.js';
import { encryptDatabaseUrl, isEncryptedDbUrl } from '../src/utils/crypto.js';
import { logger } from '../src/utils/logger.js';

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

async function encryptDatabaseUrls() {
  console.log('\n🔐 Database URL Encryption Migration');
  console.log('=====================================\n');

  if (isDryRun) {
    console.log('📝 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Fetch all universities with database URLs
    const universities = await sharedDb.university.findMany({
      where: {
        databaseUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        domain: true,
        databaseUrl: true,
      },
    });

    if (universities.length === 0) {
      console.log('✅ No universities with database URLs found.\n');
      return;
    }

    console.log(`Found ${universities.length} universities with database URLs.\n`);

    // Separate encrypted and unencrypted
    const unencrypted = universities.filter(u => u.databaseUrl && !isEncryptedDbUrl(u.databaseUrl));
    const alreadyEncrypted = universities.filter(u => u.databaseUrl && isEncryptedDbUrl(u.databaseUrl));

    console.log(`  ✅ Already encrypted: ${alreadyEncrypted.length}`);
    console.log(`  ⚠️  Need encryption:  ${unencrypted.length}\n`);

    if (unencrypted.length === 0) {
      console.log('✅ All database URLs are already encrypted!\n');
      return;
    }

    // List universities to be encrypted
    console.log('Universities to encrypt:');
    for (const uni of unencrypted) {
      console.log(`  - ${uni.name} (${uni.domain})`);
    }
    console.log('');

    // Confirmation (unless --force)
    if (!isDryRun && !isForce) {
      console.log('⚠️  This will encrypt the database URLs in the database.');
      console.log('   Make sure you have a backup before proceeding.\n');
      console.log('   Run with --dry-run to preview changes first.');
      console.log('   Run with --force to skip this confirmation.\n');

      // Wait for user input
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('Proceed with encryption? (yes/no): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Encryption cancelled.\n');
        return;
      }
      console.log('');
    }

    // Encrypt each unencrypted URL
    let successCount = 0;
    let errorCount = 0;

    for (const uni of unencrypted) {
      try {
        const encryptedUrl = encryptDatabaseUrl(uni.databaseUrl!);

        if (isDryRun) {
          console.log(`[DRY RUN] Would encrypt: ${uni.name}`);
          console.log(`          Original length: ${uni.databaseUrl!.length} chars`);
          console.log(`          Encrypted length: ${encryptedUrl.length} chars`);
        } else {
          await sharedDb.university.update({
            where: { id: uni.id },
            data: { databaseUrl: encryptedUrl },
          });
          console.log(`✅ Encrypted: ${uni.name} (${uni.domain})`);
          logger.info({ universityId: uni.id, name: uni.name }, 'Database URL encrypted');
        }
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to encrypt: ${uni.name} - ${(error as Error).message}`);
        logger.error({ error, universityId: uni.id }, 'Failed to encrypt database URL');
        errorCount++;
      }
    }

    console.log('\n=====================================');
    if (isDryRun) {
      console.log(`📝 DRY RUN COMPLETE`);
      console.log(`   Would encrypt: ${successCount} URLs`);
      console.log(`   Errors: ${errorCount}`);
    } else {
      console.log(`✅ ENCRYPTION COMPLETE`);
      console.log(`   Encrypted: ${successCount} URLs`);
      console.log(`   Errors: ${errorCount}`);
    }
    console.log('=====================================\n');

  } catch (error) {
    logger.error({ error }, 'Migration failed');
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sharedDb.$disconnect();
  }
}

encryptDatabaseUrls();
