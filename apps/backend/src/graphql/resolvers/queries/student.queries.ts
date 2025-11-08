import { GraphQLError } from 'graphql';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';

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
      },
    });

    if (!student) {
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return student;
  },
};

