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

  // Optional: Create sample universities for testing
  if (env.NODE_ENV === 'development') {
    console.log('\n📚 Creating sample universities for development...');

    const sampleUniversities = [
      {
        name: 'Massachusetts Institute of Technology',
        domain: 'mit.edu',
        country: 'United States',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/MIT_logo.svg/512px-MIT_logo.svg.png',
        websiteUrl: 'https://www.mit.edu',
      },
      {
        name: 'Stanford University',
        domain: 'stanford.edu',
        country: 'United States',
        logoUrl: 'https://identity.stanford.edu/wp-content/uploads/sites/3/2020/07/block-s-right.png',
        websiteUrl: 'https://www.stanford.edu',
      },
    ];

    for (const uni of sampleUniversities) {
      const existing = await sharedDb.university.findUnique({
        where: { domain: uni.domain },
      });

      if (!existing) {
        // Generate wallet for university (placeholder)
        const walletAddress = `${uni.domain.split('.')[0]}_wallet_${Date.now()}`;

        await sharedDb.university.create({
          data: {
            ...uni,
            walletAddress,
            status: 'PENDING_APPROVAL',
            superAdminPubkey: env.SOLANA_SUPER_ADMIN_PUBKEY,
          },
        });

        console.log(`  ✅ Created university: ${uni.name}`);
      } else {
        console.log(`  ⏭️  University already exists: ${uni.name}`);
      }
    }
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Credentials:');
  console.log(`   Email: ${superAdminEmail}`);
  console.log(`   Password: ${superAdminPassword}`);
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

