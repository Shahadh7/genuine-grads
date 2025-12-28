import { GraphQLError } from 'graphql';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { sharedDb } from '../../../db/shared.client.js';
import { logger } from '../../../utils/logger.js';

interface CertificatesFilter {
  status?: string;
  studentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const certificateQueries = {
  /**
   * Get certificates with filters
   */
  async certificates(_: any, args: CertificatesFilter, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const { status, studentId, search, limit = 50, offset = 0 } = args;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (search) {
      where.OR = [
        { certificateNumber: { contains: search, mode: 'insensitive' } },
        { badgeTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await universityDb.certificate.findMany({
      where,
      take: Math.min(limit, 100),
      skip: offset,
      orderBy: {
        issuedAt: 'desc',
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentNumber: true,
            email: true,
            walletAddress: true,
          },
        },
        enrollment: {
          include: {
            course: true,
          },
        },
      },
    });
  },

  /**
   * Get certificate by ID
   */
  async certificate(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const certificate = await universityDb.certificate.findUnique({
      where: { id },
      include: {
        student: true,
        enrollment: {
          include: {
            course: true,
            achievements: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new GraphQLError('Certificate not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return certificate;
  },

  /**
   * Get certificate by certificate number
   */
  async certificateByNumber(_: any, { certificateNumber }: { certificateNumber: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const certificate = await universityDb.certificate.findUnique({
      where: { certificateNumber },
      include: {
        student: true,
        enrollment: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new GraphQLError('Certificate not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return certificate;
  },

  /**
   * Get certificate templates
   */
  async certificateTemplates(_: any, __: any, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const templates = await universityDb.certificateTemplate.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return templates.map((template: any) => parseTemplate(template));
  },

  /**
   * Get certificate template by ID
   */
  async certificateTemplate(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const template = await universityDb.certificateTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new GraphQLError('Template not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return parseTemplate(template);
  },

  /**
   * Get courses
   */
  async courses(_: any, { department, isActive }: { department?: string; isActive?: boolean }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const where: any = {};
    if (department) where.department = department;
    if (isActive !== undefined) where.isActive = isActive;

    return await universityDb.course.findMany({
      where,
      orderBy: {
        code: 'asc',
      },
    });
  },

  /**
   * Get course by ID
   */
  async course(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const course = await universityDb.course.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new GraphQLError('Course not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return course;
  },

  /**
   * Get mint activity logs
   */
  async mintActivityLogs(
    _: any,
    { status, studentWallet, limit = 50, offset = 0 }: any,
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);

    const where: any = {
      universityId: context.admin!.universityId,
    };

    if (status) where.status = status;
    if (studentWallet) where.studentWallet = studentWallet;

    return await sharedDb.mintActivityLog.findMany({
      where,
      take: Math.min(limit, 100),
      skip: offset,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  /**
   * Get revoked certificates
   */
  async revokedCertificates(_: any, __: any, context: GraphQLContext) {
    requireUniversityAdmin(context);

    return await sharedDb.revokedCertIndex.findMany({
      where: {
        revokedByUniversityId: context.admin!.universityId,
      },
      orderBy: {
        revokedAt: 'desc',
      },
      include: {
        revokedByUniversity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  /**
   * Get batch issuance jobs
   */
  async batchIssuanceJobs(_: any, { status, limit = 20 }: any, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const where: any = {};
    if (status) where.status = status;

    return await universityDb.batchIssuanceJob.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get batch issuance job by job ID
   */
  async batchIssuanceJob(_: any, { jobId }: { jobId: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const job = await universityDb.batchIssuanceJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new GraphQLError('Batch job not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return job;
  },
};

function parseTemplate(template: any) {
  if (!template) {
    return template;
  }

  let parsedFields: Record<string, unknown> = {};
  if (typeof template.templateFields === 'string') {
    try {
      parsedFields = JSON.parse(template.templateFields);
    } catch (error) {
      logger.warn({ templateId: template.id, error }, 'Failed to parse templateFields JSON');
      parsedFields = {};
    }
  } else if (template.templateFields) {
    parsedFields = template.templateFields;
  }

  let parsedDesign: Record<string, unknown> | null = null;
  if (typeof template.designTemplate === 'string') {
    try {
      parsedDesign = JSON.parse(template.designTemplate);
    } catch (error) {
      logger.warn({ templateId: template.id, error }, 'Failed to parse designTemplate JSON');
      parsedDesign = null;
    }
  } else if (template.designTemplate) {
    parsedDesign = template.designTemplate;
  }

  return {
    ...template,
    templateFields: parsedFields,
    designTemplate: parsedDesign,
  };
}

