#!/usr/bin/env tsx
/**
 * Migrate all university databases with the latest schema changes
 *
 * Usage: npx tsx scripts/migrate-all-universities.ts
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sharedDb } from '../src/db/shared.client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILE = join(__dirname, '../migrations/add_verification_log.sql');

async function runMigration(databaseUrl: string, universityName: string) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log(`\n📦 Migrating database for: ${universityName}`);

    // Read migration SQL
    const migrationSql = readFileSync(MIGRATION_FILE, 'utf-8');

    // Execute migration
    await pool.query(migrationSql);

    console.log(`✅ Successfully migrated: ${universityName}`);
    return { success: true, universityName };
  } catch (error: any) {
    console.error(`❌ Failed to migrate ${universityName}:`, error.message);
    return { success: false, universityName, error: error.message };
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Starting bulk migration for all university databases...\n');

  try {
    // Fetch all universities from shared database
    const universities = await sharedDb.university.findMany({
      where: {
        status: 'APPROVED', // Only migrate approved universities
        databaseUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        databaseUrl: true,
      },
    });

    console.log(`Found ${universities.length} university database(s) to migrate\n`);

    if (universities.length === 0) {
      console.log('No universities found. Exiting...');
      return;
    }

    // Run migrations in parallel
    const results = await Promise.all(
      universities.map((uni) =>
        runMigration(uni.databaseUrl!, uni.name)
      )
    );

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\nFailed migrations:');
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.universityName}: ${r.error}`);
        });
      process.exit(1);
    }

    console.log('\n✨ All migrations completed successfully!');
  } catch (error: any) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await sharedDb.$disconnect();
  }
}

main();
