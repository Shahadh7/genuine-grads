/**
 * Migration script to fix certificate status values from "SUCCESS" to "MINTED"
 * Run this to fix the GraphQL enum mismatch error
 */

import { sharedDb } from '../src/db/shared.client.js';
import { getUniversityDb } from '../src/db/university.client.js';

async function fixCertificateStatus() {
  console.log('Starting certificate status fix...');

  // Get all universities
  const universities = await sharedDb.university.findMany({
    where: {
      databaseUrl: { not: null },
    },
  });

  console.log(`Found ${universities.length} universities to process`);

  let totalFixed = 0;

  for (const university of universities) {
    if (!university.databaseUrl) continue;

    console.log(`\nProcessing university: ${university.name}`);

    try {
      const universityDb = await getUniversityDb(university.databaseUrl);

      // Find certificates with "SUCCESS" status
      const certificatesWithSuccess = await universityDb.certificate.findMany({
        where: {
          status: 'SUCCESS',
        },
        select: {
          id: true,
          certificateNumber: true,
          status: true,
        },
      });

      if (certificatesWithSuccess.length === 0) {
        console.log(`  No certificates with SUCCESS status found`);
        continue;
      }

      console.log(`  Found ${certificatesWithSuccess.length} certificates with SUCCESS status`);

      // Update them to MINTED
      const result = await universityDb.certificate.updateMany({
        where: {
          status: 'SUCCESS',
        },
        data: {
          status: 'MINTED',
        },
      });

      console.log(`  ✓ Updated ${result.count} certificates to MINTED status`);
      totalFixed += result.count;

      // Disconnect the university DB
      await universityDb.$disconnect();
    } catch (error: any) {
      console.error(`  ✗ Error processing ${university.name}:`, error.message);
    }
  }

  console.log(`\n✅ Migration complete! Total certificates fixed: ${totalFixed}`);

  await sharedDb.$disconnect();
}

fixCertificateStatus()
  .then(() => {
    console.log('\nScript finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
