import { GraphQLError } from 'graphql';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { hashNIC } from '../../../utils/crypto.js';
import { sharedDb } from '../../../db/shared.client.js';

interface StudentsFilter {
  search?: string;
  program?: string;
  batchYear?: number;
  limit?: number;
  offset?: number;
}

export const studentQueries = {
  /**
   * Get students with filters
   */
  async students(_: any, args: StudentsFilter, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const { search, program, batchYear, limit = 50, offset = 0 } = args;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (program) {
      where.program = { contains: program, mode: 'insensitive' };
    }

    if (batchYear) {
      where.enrollmentYear = batchYear;
    }

    return await universityDb.student.findMany({
      where,
      take: Math.min(limit, 100), // Cap at 100
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            certificates: true,
            enrollments: true,
          },
        },
        achievements: {
          include: {
            achievement: true,
          },
          orderBy: {
            awardedAt: 'desc',
          },
        },
      },
    });
  },

  async studentsWithoutCertificates(
    _: any,
    { limit, offset }: { limit?: number; offset?: number },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const take = Math.min(limit ?? 10, 50);
    const skip = offset ?? 0;

    return universityDb.student.findMany({
      where: {
        isActive: true,
        certificates: {
          none: {},
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take,
      skip,
      include: {
        certificates: true,
        enrollments: {
          include: {
            course: true,
            achievements: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        achievements: {
          include: {
            achievement: true,
          },
          orderBy: {
            awardedAt: 'desc',
          },
        },
      },
    });
  },

  /**
   * Get student by ID
   */
  async student(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const student = await universityDb.student.findUnique({
      where: { id },
      include: {
        certificates: {
          orderBy: {
            issuedAt: 'desc',
          },
        },
        enrollments: {
          include: {
            course: true,
            achievements: true,
          },
        },
        achievements: {
          include: {
            achievement: true,
          },
          orderBy: {
            awardedAt: 'desc',
          },
        },
      },
    });

    if (!student) {
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return student;
  },

  async lookupStudentByNationalId(
    _: any,
    { nationalId }: { nationalId: string },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    if (!nationalId || nationalId.trim().length === 0) {
      throw new GraphQLError('National ID is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const nicHash = hashNIC(nationalId.trim());

    const [student, globalIndex] = await Promise.all([
      universityDb.student.findFirst({
        where: { nicHash },
      }),
      sharedDb.globalStudentIndex.findUnique({
        where: { nicHash },
        include: {
          createdByUniversity: {
            select: { name: true },
          },
        },
      }),
    ]);

    return {
      existsInUniversity: !!student,
      globalExists: !!globalIndex,
      studentId: student?.id ?? null,
      fullName: student?.fullName ?? null,
      email: student?.email ?? null,
      walletAddress: student?.walletAddress ?? null,
      globalWalletAddress: globalIndex?.walletAddress ?? null,
      createdByUniversityName: globalIndex?.createdByUniversity?.name ?? null,
    };
  },

  async achievementCatalog(
    _: any,
    { search }: { search?: string },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    return universityDb.achievementCatalog.findMany({
      where: search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: {
        title: 'asc',
      },
    });
  },
};

