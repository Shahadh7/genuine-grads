import { PrismaClient as SharedPrismaClient } from '../node_modules/.prisma/shared/index.js';
import { hashPassword } from '../src/auth/password.js';
import { env } from '../src/env.js';

const sharedDb = new SharedPrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create super admin
  const superAdminEmail = env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = env.SUPER_ADMIN_PASSWORD;

  // Check if super admin already exists
  const existingAdmin = await sharedDb.admin.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingAdmin) {
    console.log(`✅ Super admin already exists: ${superAdminEmail}`);
  } else {
    const passwordHash = await hashPassword(superAdminPassword);

    const superAdmin = await sharedDb.admin.create({
      data: {
        email: superAdminEmail,
        username: 'superadmin',
        passwordHash,
        fullName: 'Super Administrator',
        isSuperAdmin: true,
        isActive: true,
      },
    });

    console.log(`✅ Created super admin: ${superAdmin.email}`);
  }

  console.log('\n✅ Seed completed successfully!');
  console.log(`   Super admin email: ${superAdminEmail}`);
  console.log('\n⚠️  Make sure to change the super admin password in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await sharedDb.$disconnect();
  });

