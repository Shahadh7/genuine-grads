import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { generateCertificateNumber, generateJobId } from '../../../utils/ids.js';
import { logger } from '../../../utils/logger.js';

interface IssueCertificateInput {
  studentId: string;
  enrollmentId?: string;
  templateId: string;
  badgeTitle: string;
  description?: string;
  degreeType?: string;
  metadata: Record<string, any>;
  achievementIds?: string[];
  expiryDate?: string;
}

interface BulkIssueInput {
  studentIds: string[];
  templateId: string;
  batchName?: string;
  certificateData: Record<string, any>;
}

interface RevokeCertificateInput {
  certificateId: string;
  reason: string;
  adminPassword: string;
}

interface CreateCertificateTemplateInput {
  name: string;
  degreeType: string;
  description?: string | null;
  templateFields: Record<string, unknown>;
  designTemplate: Record<string, unknown>;
  backgroundImage?: string | null;
}

interface UpdateCertificateTemplateInput {
  name?: string | null;
  description?: string | null;
  templateFields?: Record<string, unknown> | null;
  designTemplate?: Record<string, unknown> | null;
  backgroundImage?: string | null;
  isActive?: boolean | null;
}

function serializeTemplatePayload(input: CreateCertificateTemplateInput | UpdateCertificateTemplateInput) {
  const data: Record<string, any> = {};

  if ('name' in input && input.name !== undefined) {
    data.name = input.name;
  }

  if ('degreeType' in input && (input as CreateCertificateTemplateInput).degreeType !== undefined) {
    data.degreeType = (input as CreateCertificateTemplateInput).degreeType;
  }

  if (input.description !== undefined) {
    data.description = input.description ?? null;
  }

  if (input.templateFields !== undefined) {
    data.templateFields = JSON.stringify(input.templateFields ?? {});
  }

  if (input.designTemplate !== undefined) {
    data.designTemplate = input.designTemplate ? JSON.stringify(input.designTemplate) : null;
  }

  if (input.backgroundImage !== undefined) {
    data.backgroundImage = input.backgroundImage ?? null;
  }

  if ('isActive' in input && input.isActive !== undefined) {
    data.isActive = input.isActive ?? false;
  }

  return data;
}

function mapTemplateResponse(template: any) {
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

export const certificateMutations = {
  /**
   * Create a certificate template
   */
  async createCertificateTemplate(
    _: any,
    { input }: { input: CreateCertificateTemplateInput },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const payload = serializeTemplatePayload(input);

    const template = await universityDb.certificateTemplate.create({
      data: payload,
    });

    logger.info(
      {
        templateId: template.id,
        universityId: context.admin!.universityId,
      },
      'Certificate template created'
    );

    return mapTemplateResponse(template);
  },

  /**
   * Update a certificate template
   */
  async updateCertificateTemplate(
    _: any,
    { id, input }: { id: string; input: UpdateCertificateTemplateInput },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const existing = await universityDb.certificateTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Certificate template not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const payload = serializeTemplatePayload(input);

    const updated = await universityDb.certificateTemplate.update({
      where: { id },
      data: payload,
    });

    logger.info(
      {
        templateId: updated.id,
        universityId: context.admin!.universityId,
      },
      'Certificate template updated'
    );

    return mapTemplateResponse(updated);
  },

  /**
   * Delete a certificate template
   */
  async deleteCertificateTemplate(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const existing = await universityDb.certificateTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Certificate template not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    await universityDb.certificateTemplate.delete({
      where: { id },
    });

    logger.info(
      {
        templateId: id,
        universityId: context.admin!.universityId,
      },
      'Certificate template deleted'
    );

    return true;
  },

  /**
   * Issue a single certificate to a student
   * Mints a compressed NFT on Solana via Helius
   */
  async issueCertificate(_: any, { input }: { input: IssueCertificateInput }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const {
      studentId,
      enrollmentId,
      badgeTitle,
      description,
      degreeType,
      metadata,
      achievementIds,
      expiryDate,
      templateId,
    } = input;

    if (!metadata || Object.keys(metadata).length === 0) {
      throw new GraphQLError('Certificate metadata is required', {
        extensions: { code: 'BAD_USER_INPUT', field: 'metadata' },
      });
    }

    const student = await universityDb.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!student.walletAddress) {
      throw new GraphQLError('Student does not have a wallet address', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const template = await universityDb.certificateTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });

    if (!template) {
      throw new GraphQLError('Certificate template not found or inactive', {
        extensions: { code: 'BAD_USER_INPUT', field: 'templateId' },
      });
    }

    let templateFields: Record<string, string> = {};
    try {
      templateFields = template.templateFields ? JSON.parse(template.templateFields) : {};
    } catch (error) {
      logger.error({ templateId, error }, 'Certificate template fields JSON parse error');
      throw new GraphQLError('Invalid certificate template configuration. Please update the template and try again.', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    for (const [field, expectedType] of Object.entries(templateFields)) {
      if (!(field in metadata)) {
        throw new GraphQLError(`Missing metadata field "${field}" required by the selected template`, {
          extensions: { code: 'BAD_USER_INPUT', field: 'metadata' },
        });
      }

      const value = metadata[field];
      if (
        expectedType &&
        expectedType !== 'any' &&
        value !== null &&
        value !== undefined &&
        typeof value !== expectedType
      ) {
        throw new GraphQLError(`Metadata field "${field}" must be of type ${expectedType}`, {
          extensions: { code: 'BAD_USER_INPUT', field: 'metadata' },
        });
      }
    }

    const university = await sharedDb.university.findUnique({
      where: { id: context.admin!.universityId },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!university.collectionAddress || !university.merkleTreeAddress) {
      throw new GraphQLError(
        'University must configure its on-chain collection and merkle tree before issuing certificates',
        { extensions: { code: 'PRECONDITION_FAILED' } }
      );
    }

    let enrollmentRecord = null;
    if (enrollmentId) {
      enrollmentRecord = await universityDb.enrollment.findFirst({
        where: { id: enrollmentId, studentId: student.id },
      });

      if (!enrollmentRecord) {
        throw new GraphQLError('Enrollment not found for the selected student', {
          extensions: { code: 'BAD_USER_INPUT', field: 'enrollmentId' },
        });
      }
    } else {
      enrollmentRecord = await universityDb.enrollment.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!enrollmentRecord) {
      throw new GraphQLError('Student must have an enrollment record to issue a certificate', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (achievementIds && achievementIds.length > 0) {
      const validAchievements = await universityDb.achievement.count({
        where: {
          id: { in: achievementIds },
          enrollment: {
            studentId: student.id,
          },
        },
      });

      if (validAchievements !== achievementIds.length) {
        throw new GraphQLError('One or more achievements do not belong to the selected student', {
          extensions: { code: 'BAD_USER_INPUT', field: 'achievementIds' },
        });
      }
    }

    const year = new Date().getFullYear();
    const dept = student.department || 'GEN';
    const count = await universityDb.certificate.count();
    const certificateNumber = generateCertificateNumber(
      university.domain.split('.')[0].toUpperCase(),
      year,
      dept,
      count + 1
    );

    const certificateMetadata = {
      name: badgeTitle,
      description: description || `Certificate issued to ${student.fullName}`,
      image: university.logoUrl || 'https://placehold.co/600x400',
      attributes: [
        { trait_type: 'Student Name', value: student.fullName },
        { trait_type: 'Student Number', value: student.studentNumber },
        { trait_type: 'University', value: university.name },
        { trait_type: 'Certificate Number', value: certificateNumber },
        { trait_type: 'Issue Date', value: new Date().toISOString() },
        { trait_type: 'Degree Type', value: degreeType || template.degreeType },
        ...Object.entries(metadata).map(([key, value]) => ({
          trait_type: key,
          value: String(value),
        })),
      ],
      template: {
        id: template.id,
        name: template.name,
        degreeType: template.degreeType,
        fields: templateFields,
      },
      enrollment: {
        id: enrollmentRecord.id,
        batchYear: enrollmentRecord.batchYear,
        status: enrollmentRecord.status,
        semester: enrollmentRecord.semester,
        gpa: enrollmentRecord.gpa,
        grade: enrollmentRecord.grade,
      },
    };

    try {
      const ipfsUri = 'ipfs://placeholder'; // TODO: replace with actual IPFS upload
      const mintAddress = `pending_${Date.now()}_${student.id.substring(0, 8)}`;
      const transactionSignature = `draft_${Date.now()}`;

      const certificate = await universityDb.certificate.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollmentRecord.id,
          certificateNumber,
          badgeTitle,
          description,
          degreeType: degreeType || template.degreeType,
          mintAddress,
          merkleTreeAddress: university.merkleTreeAddress,
          ipfsMetadataUri: ipfsUri,
          transactionSignature,
          status: 'PENDING',
          metadataJson: JSON.stringify(certificateMetadata),
          achievementIds: achievementIds || [],
          issuedByAdminId: context.admin!.id,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
        include: {
          student: true,
        },
      });

      await universityDb.certificateTemplate.update({
        where: { id: template.id },
        data: {
          timesUsed: {
            increment: 1,
          },
        },
      });

      await sharedDb.mintActivityLog.create({
        data: {
          studentWallet: student.walletAddress,
          mintAddress,
          universityId: university.id,
          badgeTitle,
          certificateNumber,
          status: 'PENDING',
          transactionSignature,
          ipfsUri,
          metadataJson: JSON.stringify(certificateMetadata),
        },
      });

      logger.info(
        {
          certificateId: certificate.id,
          certificateNumber,
          studentId: student.id,
          mintAddress,
        },
        'Certificate draft created'
      );

      return certificate;
    } catch (error) {
      logger.error({ error, studentId }, 'Failed to create certificate draft');

      await sharedDb.mintActivityLog.create({
        data: {
          studentWallet: student.walletAddress,
          mintAddress: `failed_${Date.now()}`,
          universityId: university.id,
          badgeTitle,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new GraphQLError('Failed to prepare certificate issuance', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  },

  /**
   * Bulk issue certificates
   * Creates a background job for batch processing
   */
  async bulkIssueCertificates(_: any, { input }: { input: BulkIssueInput }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const { studentIds, batchName, certificateData } = input;

    if (studentIds.length === 0) {
      throw new GraphQLError('No students provided', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Generate job ID
    const jobId = generateJobId();

    // Create batch job record
    const batchJob = await universityDb.batchIssuanceJob.create({
      data: {
        jobId,
        batchName,
        totalStudents: studentIds.length,
        status: 'PENDING',
        studentIds,
        certificateData: JSON.stringify(certificateData),
        createdByAdminId: context.admin!.id,
      },
    });

    // TODO: Queue the job with BullMQ
    // await certificateQueue.add('bulk-issue', {
    //   jobId,
    //   universityId: context.admin!.universityId,
    //   studentIds,
    //   certificateData,
    // });

    logger.info(
      {
        jobId,
        totalStudents: studentIds.length,
      },
      'Bulk certificate issuance job created'
    );

    return batchJob;
  },

  /**
   * Revoke a certificate
   * Burns the NFT and adds to revocation index
   */
  async revokeCertificate(_: any, { input }: { input: RevokeCertificateInput }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const { certificateId, reason, adminPassword } = input;

    // Verify admin password
    const admin = await sharedDb.admin.findUnique({
      where: { id: context.admin!.id },
    });

    if (!admin) {
      throw new GraphQLError('Admin not found', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // TODO: Verify password
    // const isPasswordValid = await verifyPassword(admin.passwordHash, adminPassword);
    // if (!isPasswordValid) {
    //   throw new GraphQLError('Invalid password', {
    //     extensions: { code: 'UNAUTHENTICATED' },
    //   });
    // }

    // Fetch certificate
    const certificate = await universityDb.certificate.findUnique({
      where: { id: certificateId },
      include: {
        student: true,
      },
    });

    if (!certificate) {
      throw new GraphQLError('Certificate not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (certificate.revoked) {
      throw new GraphQLError('Certificate is already revoked', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    try {
      // TODO: Burn the compressed NFT on Solana
      // await burnCompressedNFT({
      //   mintAddress: certificate.mintAddress,
      //   owner: certificate.student.walletAddress,
      //   universityKeypair: decrypt(university.privateKeyEncrypted),
      // });

      // Mark certificate as revoked in university DB
      const updated = await universityDb.certificate.update({
        where: { id: certificateId },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revocationReason: reason,
        },
        include: {
          student: true,
        },
      });

      // Add to revocation index in shared DB
      await sharedDb.revokedCertIndex.create({
        data: {
          mintAddress: certificate.mintAddress,
          certificateNumber: certificate.certificateNumber,
          revokedByUniversityId: context.admin!.universityId!,
          revokedByAdminId: context.admin!.id,
          reason,
          studentWallet: certificate.student.walletAddress,
        },
      });

      logger.info(
        {
          certificateId,
          mintAddress: certificate.mintAddress,
          reason,
        },
        'Certificate revoked'
      );

      return updated;
    } catch (error) {
      logger.error({ error, certificateId }, 'Failed to revoke certificate');
      throw new GraphQLError('Failed to revoke certificate', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  },
};

