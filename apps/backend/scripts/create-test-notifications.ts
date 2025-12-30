#!/usr/bin/env tsx
/**
 * Create test notifications for testing the notification system
 */

import { sharedDb } from '../src/db/shared.client.js';
import { getUniversityDb } from '../src/db/university.client.js';

async function main() {
  console.log('Creating test notifications...\n');

  // Create admin notification
  const admin = await sharedDb.admin.findFirst({
    where: { isActive: true }
  });

  if (admin) {
    console.log('Creating test notification for admin:', admin.email);

    const adminNotification = await sharedDb.adminNotification.create({
      data: {
        adminId: admin.id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Test Notification',
        message: 'This is a test notification to verify the notification system is working correctly.',
        priority: 'NORMAL',
        metadata: { test: true },
      }
    });

    console.log('✅ Created admin notification:', adminNotification.id);
  } else {
    console.log('⚠️ No admin found');
  }

  // Create student notification
  const university = await sharedDb.university.findFirst({
    where: {
      status: 'APPROVED',
      databaseUrl: { not: null }
    }
  });

  if (university && university.databaseUrl) {
    console.log('\nUsing university:', university.name);

    const uniDb = getUniversityDb(university.databaseUrl);

    const student = await uniDb.student.findFirst({
      where: { isActive: true }
    });

    if (student) {
      console.log('Creating test notification for student:', student.email);

      const studentNotification = await uniDb.studentNotification.create({
        data: {
          studentId: student.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Welcome to GenuineGrads!',
          message: 'Your notification system is now active. You will receive updates about your certificates and achievements here.',
          priority: 'NORMAL',
          metadata: { test: true },
        }
      });

      console.log('✅ Created student notification:', studentNotification.id);
    } else {
      console.log('⚠️ No student found in university database');
    }
  } else {
    console.log('⚠️ No approved university with database found');
  }

  console.log('\n✨ Done!');
  await sharedDb.$disconnect();
}

main().catch(console.error);
