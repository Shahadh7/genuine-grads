/**
 * Create Super Admin Account
 * 
 * Usage:
 *   npx tsx scripts/create-super-admin.ts
 */

import { sharedDb } from '../src/db/shared.client.js';
import { hashPassword } from '../src/auth/password.js';
import { logger } from '../src/utils/logger.js';

async function createSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@genuinegrads.com';
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const username = 'superadmin';
  const fullName = 'Super Admin';

  if (!password) {
    console.error('\n❌ Error: SUPER_ADMIN_PASSWORD environment variable is required');
    console.log('   Set it in your .env file or pass it directly:');
    console.log('   SUPER_ADMIN_PASSWORD=YourSecurePassword npx tsx scripts/create-super-admin.ts\n');
    process.exit(1);
  }

  try {
    // Check if super admin already exists
    const existing = await sharedDb.admin.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isSuperAdmin) {
        logger.info('Super admin already exists');
        console.log('\n✅ Super admin already exists!');
        console.log(`   Email: ${email}`);
        return;
      } else {
        // Update existing admin to be super admin
        await sharedDb.admin.update({
          where: { email },
          data: { isSuperAdmin: true },
        });
        logger.info('Updated existing admin to super admin');
        console.log('\n✅ Updated existing admin to super admin!');
        console.log(`   Email: ${email}`);
        return;
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create super admin
    const admin = await sharedDb.admin.create({
      data: {
        email,
        username,
        passwordHash,
        fullName,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    logger.info({ adminId: admin.id, email }, 'Super admin created');

    console.log('\n✅ Super admin created successfully!');
    console.log(`   Email: ${email}`);
    console.log('\n🔗 Next steps:');
    console.log(`   1. Go to http://localhost:3000/login`);
    console.log(`   2. Login with your credentials`);
    console.log(`   3. Register universities from /admin/universities/register`);
    console.log('');

  } catch (error) {
    logger.error({ error }, 'Failed to create super admin');
    console.error('\n❌ Failed to create super admin:', error);
    process.exit(1);
  } finally {
    await sharedDb.$disconnect();
  }
}

createSuperAdmin();

