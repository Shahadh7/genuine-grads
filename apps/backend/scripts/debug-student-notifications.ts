#!/usr/bin/env tsx
/**
 * Debug student notifications
 */

import { sharedDb } from '../src/db/shared.client.js';
import { getUniversityDb } from '../src/db/university.client.js';

async function main() {
  // Get UOM university
  const uom = await sharedDb.university.findFirst({
    where: { name: { contains: 'Moratuwa' } }
  });

  if (!uom || !uom.databaseUrl) {
    console.log('UOM not found');
    return;
  }

  console.log('UOM ID:', uom.id);

  const uniDb = getUniversityDb(uom.databaseUrl);

  // Check students
  const students = await uniDb.student.findMany({
    select: { id: true, email: true, walletAddress: true, studentNumber: true }
  });

  console.log('\nStudents in UOM:');
  students.forEach(s => {
    console.log('  ID:', s.id, '| Wallet:', s.walletAddress, '| Email:', s.email);
  });

  // Check notifications
  const notifications = await uniDb.studentNotification.findMany({
    include: { student: { select: { id: true, walletAddress: true } } }
  });

  console.log('\nNotifications in UOM DB:');
  notifications.forEach(n => {
    console.log('  Notification ID:', n.id);
    console.log('    For student ID:', n.studentId);
    console.log('    Student wallet:', n.student.walletAddress);
    console.log('    Title:', n.title);
    console.log('');
  });

  // Check GlobalStudentIndex
  const globalStudents = await sharedDb.globalStudentIndex.findMany({
    where: { createdByUniversityId: uom.id }
  });

  console.log('\nGlobal Student Index entries for UOM:');
  globalStudents.forEach(g => {
    console.log('  Global ID:', g.id, '| Wallet:', g.walletAddress);
  });

  // The issue: notification uses local student ID, but context uses GlobalStudentIndex ID
  console.log('\n\n=== ISSUE IDENTIFIED ===');
  console.log('The studentNotifications query uses context.student.id which is the GlobalStudentIndex ID');
  console.log('But notifications are stored with the local university student ID');
  console.log('\nLocal Student IDs:', students.map(s => s.id));
  console.log('Global Student IDs:', globalStudents.map(g => g.id));

  await sharedDb.$disconnect();
}

main().catch(console.error);
