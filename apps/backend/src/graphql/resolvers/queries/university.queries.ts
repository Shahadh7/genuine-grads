import { GraphQLError } from 'graphql';
import { GraphQLContext, requireSuperAdmin, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { sharedDb } from '../../../db/shared.client.js';

export const universityQueries = {
  /**
   * Get pending universities (Super Admin only)
   */
  async pendingUniversities(_: any, __: any, context: GraphQLContext) {
    requireSuperAdmin(context);

    return await sharedDb.university.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        admins: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get all universities with optional filter (Super Admin only)
   */
  async allUniversities(_: any, { status }: { status?: string }, context: GraphQLContext) {
    requireSuperAdmin(context);

    return await sharedDb.university.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        admins: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get university by ID (Super Admin only)
   */
  async university(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireSuperAdmin(context);

    const university = await sharedDb.university.findUnique({
      where: { id },
      include: {
        admins: true,
        mintLogs: {
          take: 10,
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return university;
  },

  /**
   * Get current admin's university (University Admin only)
   */
  async myUniversity(_: any, __: any, context: GraphQLContext) {
    requireUniversityAdmin(context);

    const university = await sharedDb.university.findUnique({
      where: { id: context.admin!.universityId },
      include: {
        admins: {
          select: {
            id: true,
            email: true,
            fullName: true,
            lastLoginAt: true,
          },
        },
      },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return university;
  },

  /**
   * Get university statistics (University Admin only)
   */
  async universityStats(_: any, __: any, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    // Get certificate counts
    const [totalCertificates, mintedCount, pendingCount, revokedCount] = await Promise.all([
      universityDb.certificate.count(),
      universityDb.certificate.count({ where: { status: 'MINTED' } }),
      universityDb.certificate.count({ where: { status: 'PENDING' } }),
      universityDb.certificate.count({ where: { revoked: true } }),
    ]);

    // Get student counts
    const [totalStudents, activeStudents] = await Promise.all([
      universityDb.student.count(),
      universityDb.student.count({ where: { isActive: true } }),
    ]);

    return {
      totalCertificates,
      mintedCount,
      pendingCount,
      revokedCount,
      activeStudents,
      totalStudents,
    };
  },

  /**
   * Get comprehensive university analytics (University Admin only)
   */
  async universityAnalytics(_: any, { days = 30 }: { days?: number }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const university = await sharedDb.university.findUnique({
      where: { id: context.admin!.universityId },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // ===== OVERVIEW =====
    const [
      totalCertificates,
      mintedCertificates,
      pendingCertificates,
      revokedCertificates,
      totalStudents,
      activeStudents,
      studentsWithWallet,
      totalCourses,
    ] = await Promise.all([
      universityDb.certificate.count(),
      universityDb.certificate.count({ where: { status: 'MINTED' } }),
      universityDb.certificate.count({ where: { status: 'PENDING' } }),
      universityDb.certificate.count({ where: { revoked: true } }),
      universityDb.student.count(),
      universityDb.student.count({ where: { isActive: true } }),
      universityDb.student.count({ where: { walletAddress: { not: null } } }),
      universityDb.course.count(),
    ]);

    // Get verification counts from university DB
    const verificationCounts = await universityDb.verificationLog.groupBy({
      by: ['verificationStatus'],
      _count: true,
    });

    const totalVerifications = verificationCounts.reduce((sum: any, v: any) => sum + v._count, 0);
    const successfulVerifications = verificationCounts.find((v: any) => v.verificationStatus === 'SUCCESS')?._count || 0;
    const failedVerifications = totalVerifications - successfulVerifications;

    const overview = {
      totalCertificates,
      mintedCertificates,
      pendingCertificates,
      revokedCertificates,
      totalStudents,
      activeStudents,
      studentsWithWallet,
      studentsWithoutWallet: totalStudents - studentsWithWallet,
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      totalCourses,
    };

    // ===== BLOCKCHAIN METRICS =====
    const mintLogs = await sharedDb.mintActivityLog.findMany({
      where: { universityId: context.admin!.universityId },
    });

    const successfulMints = mintLogs.filter((m: any) => m.status === 'SUCCESS').length;
    const failedMints = mintLogs.filter((m: any) => m.status === 'FAILED').length;
    const successRate = mintLogs.length > 0 ? (successfulMints / mintLogs.length) * 100 : 0;

    // Get recent mints with student info
    const recentMintLogs = await sharedDb.mintActivityLog.findMany({
      where: { universityId: context.admin!.universityId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Get student names for recent mints
    const recentMints = await Promise.all(
      recentMintLogs.map(async (log: any) => {
        let studentName = 'Unknown';
        if (log.studentWallet) {
          const student = await universityDb.student.findFirst({
            where: { walletAddress: log.studentWallet },
            select: { fullName: true },
          });
          if (student) {
            studentName = student.fullName;
          }
        }
        return {
          id: log.id,
          signature: log.transactionSignature,
          studentName,
          badgeTitle: log.badgeTitle,
          timestamp: log.timestamp,
          status: log.status,
        };
      })
    );

    const blockchainMetrics = {
      totalMintTransactions: mintLogs.length,
      successfulMints,
      failedMints,
      treeAddress: university?.merkleTreeAddress || null,
      collectionAddress: university?.collectionAddress || null,
      successRate: Math.round(successRate * 100) / 100,
      recentMints,
    };

    // ===== TRENDS =====
    // Certificates per day (last N days)
    const certificatesPerDay = await getCertificatesPerDay(universityDb, days);

    // Verifications per day (last N days)
    const verificationsPerDay = await getVerificationsPerDay(universityDb, days);

    // Students per month (based on days parameter)
    const studentsPerMonth = await getStudentsPerMonth(universityDb, days);

    const trends = {
      certificatesPerDay,
      verificationsPerDay,
      studentsPerMonth,
    };

    // ===== TOP PROGRAMS =====
    const programStats = await universityDb.student.groupBy({
      by: ['program', 'department'],
      _count: { id: true },
    });

    // Get certificate counts per program
    const topPrograms = await Promise.all(
      programStats
        .filter((p: any) => p.program)
        .slice(0, 10)
        .map(async (p: any) => {
          const studentIds = await universityDb.student.findMany({
            where: { program: p.program },
            select: { id: true },
          });

          const certificateCount = await universityDb.certificate.count({
            where: { studentId: { in: studentIds.map((s: any) => s.id) } },
          });

          return {
            program: p.program!,
            department: p.department,
            studentCount: p._count.id,
            certificateCount,
          };
        })
    );

    // Sort by student count
    topPrograms.sort((a: any, b: any) => b.studentCount - a.studentCount);

    return {
      overview,
      blockchainMetrics,
      trends,
      topPrograms,
    };
  },
};

// Helper function to get certificates per day
async function getCertificatesPerDay(universityDb: any, days: number) {
  const results: { date: string; count: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await universityDb.certificate.count({
      where: {
        issuedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    results.push({
      date: startOfDay.toISOString().split('T')[0],
      count,
    });
  }

  return results;
}

// Helper function to get verifications per day
async function getVerificationsPerDay(universityDb: any, days: number) {
  const results: { date: string; count: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await universityDb.verificationLog.count({
      where: {
        verifiedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    results.push({
      date: startOfDay.toISOString().split('T')[0],
      count,
    });
  }

  return results;
}

// Helper function to get students per month (based on days parameter)
async function getStudentsPerMonth(universityDb: any, days: number) {
  const results: { month: string; count: number }[] = [];
  const today = new Date();

  // Calculate number of months based on days
  // 7 days = 1 month, 14 days = 1 month, 30 days = 2 months, 90 days = 4 months
  const monthsToShow = days <= 14 ? 1 : days <= 30 ? 2 : days <= 60 ? 3 : Math.ceil(days / 30);

  for (let i = monthsToShow - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const count = await universityDb.student.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const monthName = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    results.push({
      month: monthName,
      count,
    });
  }

  return results;
}

