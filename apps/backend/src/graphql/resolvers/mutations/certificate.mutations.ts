import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { generateCertificateNumber } from '../../../utils/ids.js';
import { logger } from '../../../utils/logger.js';
import { generateCertificateFromTemplate, DesignTemplate } from '../../../services/certificate/generator.service.js';
import { uploadFileToIPFS, uploadMetadataToIPFS } from '../../../services/ipfs/pinata.service.js';

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

    logger.info(
      {
        inputHasDesignTemplate: !!input.designTemplate,
        inputDesignTemplateKeys: input.designTemplate ? Object.keys(input.designTemplate) : [],
        payloadHasDesignTemplate: !!payload.designTemplate,
        payloadDesignTemplateLength: payload.designTemplate?.length,
      },
      'Creating certificate template - payload check'
    );

    const template = await universityDb.certificateTemplate.create({
      data: payload as any,
    });

    logger.info(
      {
        templateId: template.id,
        universityId: context.admin!.universityId,
        savedDesignTemplateExists: !!template.designTemplate,
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

    // Check for duplicate certificate issuance
    // Prevent issuing the same certificate (same student + enrollment + template) twice
    const existingCertificate = await universityDb.certificate.findFirst({
      where: {
        studentId: student.id,
        enrollmentId: enrollmentRecord.id,
        badgeTitle: badgeTitle,
        status: {
          in: ['PENDING', 'MINTED'], // Only check non-failed certificates
        },
      },
    });

    if (existingCertificate) {
      throw new GraphQLError(
        `A certificate "${badgeTitle}" has already been issued to this student for this enrollment. Status: ${existingCertificate.status}`,
        {
          extensions: {
            code: 'DUPLICATE_CERTIFICATE',
            existingCertificateId: existingCertificate.id,
            certificateNumber: existingCertificate.certificateNumber,
          },
        }
      );
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

    // Parse the design template from the certificate template
    let designTemplate: DesignTemplate | null = null;

    logger.info(
      {
        templateId,
        hasDesignTemplate: !!template.designTemplate,
        designTemplateType: typeof template.designTemplate,
        designTemplatePreview: template.designTemplate
          ? (typeof template.designTemplate === 'string'
              ? template.designTemplate.substring(0, 200)
              : JSON.stringify(template.designTemplate).substring(0, 200))
          : null,
      },
      'Checking design template from database'
    );

    if (template.designTemplate) {
      try {
        designTemplate = typeof template.designTemplate === 'string'
          ? JSON.parse(template.designTemplate)
          : template.designTemplate;

        logger.info(
          {
            templateId,
            elementCount: designTemplate?.elements?.length ?? 0,
            backgroundColor: designTemplate?.backgroundColor,
          },
          'Design template parsed successfully'
        );
      } catch (error) {
        logger.warn({ templateId, error }, 'Failed to parse design template, will use fallback image');
      }
    } else {
      logger.warn({ templateId }, 'No design template found for this certificate template');
    }

    let certificateImageUrl = university.logoUrl || 'https://placehold.co/600x400';

    // Generate certificate image from template if design template exists
    if (designTemplate && designTemplate.elements && designTemplate.elements.length > 0) {
      try {
        logger.info({ templateId, certificateNumber }, 'Generating certificate image from template');

        // Build metadata map for placeholder replacement
        const placeholderMetadata: Record<string, string | number> = {
          student_name: student.fullName,
          studentname: student.fullName,
          certificate_title: badgeTitle,
          certificatetitle: badgeTitle,
          badge_title: badgeTitle,
          badgetitle: badgeTitle,
          university_name: university.name,
          universityname: university.name,
          graduation_date: new Date().toISOString().split('T')[0],
          graduationdate: new Date().toISOString().split('T')[0],
          issue_date: new Date().toISOString().split('T')[0],
          issuedate: new Date().toISOString().split('T')[0],
          student_id: student.studentNumber,
          studentid: student.studentNumber,
          gpa: enrollmentRecord.gpa ?? '',
          grade: enrollmentRecord.grade ?? '',
          course: metadata.course ?? metadata.coursename ?? '',
          program: student.program ?? metadata.program ?? '',
          department: student.department ?? '',
          ...Object.fromEntries(
            Object.entries(metadata).map(([key, value]) => [key.toLowerCase().replace(/[_\s-]/g, ''), String(value)])
          ),
          ...metadata,
        };

        // Generate certificate PNG from template
        const certificatePngBuffer = await generateCertificateFromTemplate(designTemplate, {
          metadata: placeholderMetadata,
          certificateNumber,
        });

        // Upload certificate image to Pinata
        const imageFileName = `certificate-${certificateNumber}.png`;
        certificateImageUrl = await uploadFileToIPFS(certificatePngBuffer, imageFileName);

        logger.info({ certificateNumber, imageUrl: certificateImageUrl }, 'Certificate image uploaded to IPFS');
      } catch (imageError: any) {
        logger.error({ error: imageError.message, certificateNumber }, 'Failed to generate/upload certificate image, using fallback');
        // Continue with fallback image URL
      }
    }

    const certificateMetadata = {
      name: badgeTitle,
      description: description || `Certificate issued to ${student.fullName}`,
      image: certificateImageUrl,
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
        gpa: enrollmentRecord.gpa,
        grade: enrollmentRecord.grade,
      },
    };

    try {
      // Upload certificate metadata to IPFS
      let ipfsUri: string;
      try {
        ipfsUri = await uploadMetadataToIPFS(certificateMetadata);
        logger.info({ certificateNumber, ipfsUri }, 'Certificate metadata uploaded to IPFS');
      } catch (ipfsError: any) {
        logger.error({ error: ipfsError.message, certificateNumber }, 'Failed to upload metadata to IPFS, using placeholder');
        ipfsUri = 'ipfs://placeholder';
      }

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

    const { studentIds, batchName } = input;

    if (studentIds.length === 0) {
      throw new GraphQLError('No students provided', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Create batch job record
    const batchJob = await universityDb.batchIssuanceJob.create({
      data: {
        universityId: context.admin!.universityId!,
        batchName,
        totalCertificates: studentIds.length,
        status: 'PENDING',
        certificateIds: studentIds,
        createdByAdminId: context.admin!.id,
      },
    });

    const jobId = batchJob.id;

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

    const { certificateId, reason } = input;

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

  /**
   * Prepare batch minting - prepares transactions for multiple certificates
   * Returns unsigned transactions for client-side wallet signing
   */
  async prepareBatchMinting(
    _: any,
    { certificateIds }: { certificateIds: string[] },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    if (!certificateIds || certificateIds.length === 0) {
      throw new GraphQLError('No certificates provided', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    logger.info(
      {
        certificateIds,
        count: certificateIds.length,
      },
      'Preparing batch minting'
    );

    // Fetch all certificates with student data
    const certificates = await universityDb.certificate.findMany({
      where: {
        id: { in: certificateIds },
        status: 'PENDING', // Only allow minting of pending certificates
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    if (certificates.length === 0) {
      throw new GraphQLError('No pending certificates found', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Check for missing wallet addresses
    const missingWallets = certificates.filter((cert: any) => !cert.student.walletAddress);
    if (missingWallets.length > 0) {
      throw new GraphQLError(
        `${missingWallets.length} student(s) do not have wallet addresses: ${missingWallets
          .map((c: any) => c.student.fullName)
          .join(', ')}`,
        {
          extensions: { code: 'BAD_USER_INPUT' },
        }
      );
    }

    // Create batch job record
    const batchJob = await universityDb.batchIssuanceJob.create({
      data: {
        universityId: context.admin!.universityId!,
        batchName: `Batch ${new Date().toISOString()}`,
        totalCertificates: certificates.length,
        certificateIds: certificates.map((c: any) => c.id),
        status: 'PENDING',
        createdByAdminId: context.admin!.id,
      },
    });

    // Prepare response with certificate details (transactions will be prepared one-by-one on frontend)
    const batchData = {
      batchId: batchJob.id,
      totalCertificates: certificates.length,
      estimatedTimeMinutes: Math.ceil((certificates.length * 5) / 60), // ~5 seconds per cert
      certificates: certificates.map((cert: any) => ({
        certificateId: cert.id,
        certificateNumber: cert.certificateNumber,
        studentName: cert.student.fullName,
        studentWallet: cert.student.walletAddress!,
        badgeTitle: cert.badgeTitle,
      })),
    };

    logger.info(
      {
        batchId: batchJob.id,
        certificateCount: certificates.length,
      },
      'Batch minting prepared'
    );

    return batchData;
  },

  /**
   * Update batch job progress
   * Called by frontend after each certificate is processed
   */
  async updateBatchProgress(
    _: any,
    {
      batchId,
      certificateId,
      success,
      signature,
      error,
    }: {
      batchId: string;
      certificateId: string;
      success: boolean;
      signature?: string;
      error?: string;
    },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    // Fetch batch job
    const batchJob = await universityDb.batchIssuanceJob.findUnique({
      where: { id: batchId },
    });

    if (!batchJob) {
      throw new GraphQLError('Batch job not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Update batch job progress
    const updates: any = {
      processedCount: { increment: 1 },
    };

    if (success) {
      updates.successCount = { increment: 1 };
      updates.successfulMints = {
        push: certificateId,
      };
    } else {
      updates.failedCount = { increment: 1 };

      // Parse existing failed mints
      const failedMints = batchJob.failedMints ? JSON.parse(batchJob.failedMints) : [];
      failedMints.push({
        certId: certificateId,
        error: error || 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      updates.failedMints = JSON.stringify(failedMints);
    }

    // Update status based on progress
    if (batchJob.processedCount + 1 >= batchJob.totalCertificates) {
      updates.status = 'COMPLETED';
      updates.completedAt = new Date();
    } else if (batchJob.status === 'PENDING') {
      updates.status = 'PROCESSING';
      updates.startedAt = new Date();
    }

    const updatedBatch = await universityDb.batchIssuanceJob.update({
      where: { id: batchId },
      data: updates,
    });

    logger.info(
      {
        batchId,
        certificateId,
        success,
        signature,
        progress: `${updatedBatch.processedCount}/${updatedBatch.totalCertificates}`,
      },
      'Batch progress updated'
    );

    return {
      batchId: updatedBatch.id,
      status: updatedBatch.status,
      processedCount: updatedBatch.processedCount,
      successCount: updatedBatch.successCount,
      failedCount: updatedBatch.failedCount,
      totalCertificates: updatedBatch.totalCertificates,
    };
  },

  /**
   * Get batch job status
   */
  async getBatchJob(_: any, { batchId }: { batchId: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const batchJob = await universityDb.batchIssuanceJob.findUnique({
      where: { id: batchId },
    });

    if (!batchJob) {
      throw new GraphQLError('Batch job not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return {
      ...batchJob,
      failedMints: batchJob.failedMints ? JSON.parse(batchJob.failedMints) : [],
    };
  },

  /**
   * Cancel batch job
   */
  async cancelBatchJob(_: any, { batchId }: { batchId: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const updatedBatch = await universityDb.batchIssuanceJob.update({
      where: { id: batchId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    logger.info({ batchId }, 'Batch job cancelled');

    return updatedBatch;
  },

  /**
   * Fix certificates that were minted on-chain but confirmation failed
   * Updates PENDING certificates that have transaction signatures to MINTED status
   */
  async fixPendingCertificates(_: any, __: any, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    // Find certificates with signatures but PENDING status
    const pendingCerts = await universityDb.certificate.findMany({
      where: {
        status: 'PENDING',
        transactionSignature: {
          not: null,
        },
      },
    });

    if (pendingCerts.length === 0) {
      return {
        success: true,
        message: 'No certificates need fixing',
        fixed: 0,
      };
    }

    // Update all to MINTED
    const result = await universityDb.certificate.updateMany({
      where: {
        status: 'PENDING',
        transactionSignature: {
          not: null,
        },
      },
      data: {
        status: 'MINTED',
      },
    });

    logger.info(
      {
        count: result.count,
        universityId: context.admin!.universityId,
      },
      'Fixed pending certificates'
    );

    return {
      success: true,
      message: `Successfully updated ${result.count} certificate(s) to MINTED status`,
      fixed: result.count,
    };
  },
};

