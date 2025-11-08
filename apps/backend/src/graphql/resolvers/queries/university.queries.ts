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
};

