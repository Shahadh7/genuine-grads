import { sharedDb } from '../src/db/shared.client.js';
import { getUniversityDb } from '../src/db/university.client.js';

async function checkStatuses() {
  const universities = await sharedDb.university.findMany({
    where: { databaseUrl: { not: null } },
  });

  for (const university of universities) {
    if (!university.databaseUrl) continue;

    try {
      const universityDb = getUniversityDb(university.databaseUrl);
      
      const statuses = await universityDb.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT status, COUNT(*) as count 
        FROM certificates 
        GROUP BY status
      `;

      console.log(`\n${university.name}:`);
      for (const row of statuses) {
        console.log(`  ${row.status}: ${row.count}`);
      }
      
      await universityDb.$disconnect();
    } catch (error: any) {
      console.log(`\n${university.name}: ${error.message}`);
    }
  }

  await sharedDb.$disconnect();
  process.exit(0);
}

checkStatuses().catch(console.error);
