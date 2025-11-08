import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { generateCertificateNumber, generateJobId } from '../../../utils/ids.js';
import { logger } from '../../../utils/logger.js';

interface IssueCertificateInput {
  studentId: string;
  enrollmentId?: string;
  templateId?: string;
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

export const certificateMutations = {
  /**
   * Issue a single certificate to a student
   * Mints a compressed NFT on Solana via Helius
   */
  async issueCertificate(_: any, { input }: { input: IssueCertificateInput }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const { studentId, enrollmentId, badgeTitle, description, degreeType, metadata, achievementIds, expiryDate } =
      input;

    // Fetch student
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

    // Fetch university info
    const university = await sharedDb.university.findUnique({
      where: { id: context.admin!.universityId },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Generate unique certificate number
    const year = new Date().getFullYear();
    const dept = student.department || 'GEN';
    
    // Get count of certificates to generate sequence
    const count = await universityDb.certificate.count();
    const certificateNumber = generateCertificateNumber(university.domain.split('.')[0].toUpperCase(), year, dept, count + 1);

    // Prepare certificate metadata for IPFS
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
        ...(degreeType ? [{ trait_type: 'Degree Type', value: degreeType }] : []),
        ...Object.entries(metadata).map(([key, value]) => ({
          trait_type: key,
          value: String(value),
        })),
      ],
    };

    try {
      // TODO: Upload metadata to IPFS
      // const ipfsUri = await uploadToIPFS(certificateMetadata);
      const ipfsUri = 'ipfs://placeholder'; // Placeholder

      // TODO: Mint compressed NFT via Helius/Solana
      // const mintResult = await mintCompressedNFT({
      //   recipient: student.walletAddress,
      //   metadataUri: ipfsUri,
      //   merkleTree: university.merkleTreeAddress,
      //   universityKeypair: decrypt(university.privateKeyEncrypted),
      // });
      
      // Placeholder mint address
      const mintAddress = `mint_${Date.now()}_${student.id.substring(0, 8)}`;
      const transactionSignature = `sig_${Date.now()}`;

      // Create certificate in university DB
      const certificate = await universityDb.certificate.create({
        data: {
          studentId: student.id,
          enrollmentId,
          certificateNumber,
          badgeTitle,
          description,
          degreeType,
          mintAddress,
          merkleTreeAddress: university.merkleTreeAddress,
          ipfsMetadataUri: ipfsUri,
          transactionSignature,
          status: 'MINTED', // In real implementation, would be PENDING then updated via webhook
          metadataJson: JSON.stringify(certificateMetadata),
          achievementIds: achievementIds || [],
          issuedByAdminId: context.admin!.id,
        },
        include: {
          student: true,
        },
      });

      // Log minting activity in shared DB
      await sharedDb.mintActivityLog.create({
        data: {
          studentWallet: student.walletAddress,
          mintAddress,
          universityId: university.id,
          badgeTitle,
          certificateNumber,
          status: 'SUCCESS',
          transactionSignature,
          ipfsUri,
          metadataJson: JSON.stringify(certificateMetadata),
          confirmedAt: new Date(),
        },
      });

      logger.info(
        {
          certificateId: certificate.id,
          certificateNumber,
          studentId: student.id,
          mintAddress,
        },
        'Certificate issued'
      );

      return certificate;
    } catch (error) {
      logger.error({ error, studentId }, 'Failed to issue certificate');
      
      // Log failed mint attempt
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

      throw new GraphQLError('Failed to mint certificate', {
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

