import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../../context.js';
import { sharedDb } from '../../../db/shared.client.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { logger } from '../../../utils/logger.js';

interface VerifyInput {
  certificateNumber?: string;
  mintAddress?: string;
}

export const publicQueries = {
  /**
   * PUBLIC: Verify a certificate (no authentication required)
   * This is the main verification endpoint used by employers and students
   */
  async verifyCertificatePublic(_: any, { certificateNumber, mintAddress }: VerifyInput, context: GraphQLContext) {
    // No auth required - this is a public endpoint
    
    if (!certificateNumber && !mintAddress) {
      throw new GraphQLError('Either certificateNumber or mintAddress is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    logger.info(
      {
        certificateNumber,
        mintAddress,
        ip: context.req.ip,
      },
      'Public certificate verification requested'
    );

    try {
      // Step 1: Check if certificate is in revocation index
      let revokedCert;
      if (mintAddress) {
        revokedCert = await sharedDb.revokedCertIndex.findUnique({
          where: { mintAddress },
          include: {
            revokedByUniversity: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        });
      } else if (certificateNumber) {
        revokedCert = await sharedDb.revokedCertIndex.findFirst({
          where: { certificateNumber },
          include: {
            revokedByUniversity: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        });
      }

      if (revokedCert) {
        return {
          isValid: false,
          status: 'REVOKED',
          certificate: null,
          revocationInfo: {
            isRevoked: true,
            revokedAt: revokedCert.revokedAt,
            reason: revokedCert.reason,
          },
          blockchainProof: {
            mintAddress: revokedCert.mintAddress,
            transactionSignature: null,
            merkleTreeAddress: null,
            metadataUri: null,
            verifiedAt: new Date(),
          },
          verificationTimestamp: new Date(),
        };
      }

      // Step 2: Search in mint activity logs to find which university issued it
      let mintLog;
      if (mintAddress) {
        mintLog = await sharedDb.mintActivityLog.findUnique({
          where: { mintAddress },
          include: {
            university: true,
          },
        });
        logger.info(
          { mintAddress, found: !!mintLog },
          'Searched MintActivityLog by mintAddress'
        );
      } else if (certificateNumber) {
        mintLog = await sharedDb.mintActivityLog.findFirst({
          where: { certificateNumber },
          include: {
            university: true,
          },
        });
        logger.info(
          { certificateNumber, found: !!mintLog },
          'Searched MintActivityLog by certificateNumber'
        );
      }

      if (!mintLog) {
        logger.warn(
          { certificateNumber, mintAddress },
          'Certificate not found in MintActivityLog'
        );
        return {
          isValid: false,
          status: 'INVALID',
          certificate: null,
          revocationInfo: {
            isRevoked: false,
            revokedAt: null,
            reason: null,
          },
          blockchainProof: null,
          verificationTimestamp: new Date(),
        };
      }

      // Step 3: Fetch full certificate details from university database
      const universityDb = getUniversityDb(mintLog.university.databaseUrl!);

      const certificate = certificateNumber
        ? await universityDb.certificate.findUnique({
            where: { certificateNumber },
            include: {
              student: {
                select: {
                  fullName: true,
                  studentNumber: true,
                },
              },
            },
          })
        : await universityDb.certificate.findUnique({
            where: { mintAddress: mintAddress! },
            include: {
              student: {
                select: {
                  fullName: true,
                  studentNumber: true,
                },
              },
            },
          });

      if (!certificate) {
        logger.warn(
          {
            certificateNumber,
            mintAddress,
            universityId: mintLog.university.id,
            universityName: mintLog.university.name,
          },
          'Certificate not found in university database'
        );
        return {
          isValid: false,
          status: 'INVALID',
          certificate: null,
          revocationInfo: {
            isRevoked: false,
            revokedAt: null,
            reason: null,
          },
          blockchainProof: null,
          verificationTimestamp: new Date(),
        };
      }

      logger.info(
        {
          certificateId: certificate.id,
          certificateNumber: certificate.certificateNumber,
          mintAddress: certificate.mintAddress,
          status: certificate.status,
        },
        'Certificate found and verified'
      );

      // Check if revoked (double check at university level)
      if (certificate.revoked) {
        return {
          isValid: false,
          status: 'REVOKED',
          certificate: {
            badgeTitle: certificate.badgeTitle,
            issueDate: certificate.issuedAt,
            university: {
              name: mintLog.university.name,
              logoUrl: mintLog.university.logoUrl,
              isVerified: mintLog.university.status === 'APPROVED',
            },
            studentName: certificate.student.fullName,
            degreeType: certificate.degreeType,
          },
          revocationInfo: {
            isRevoked: true,
            revokedAt: certificate.revokedAt,
            reason: certificate.revocationReason,
          },
          blockchainProof: {
            mintAddress: certificate.mintAddress,
            transactionSignature: certificate.transactionSignature,
            merkleTreeAddress: certificate.merkleTreeAddress,
            metadataUri: certificate.ipfsMetadataUri,
            verifiedAt: new Date(),
          },
          verificationTimestamp: new Date(),
        };
      }

      // Step 4: Verify on-chain (TODO: integrate with Helius NFT API)
      // const onChainValid = await verifyNFTOnChain(certificate.mintAddress);
      const onChainValid = true; // Placeholder

      // Certificate is valid!
      return {
        isValid: true,
        status: 'VALID',
        certificate: {
          badgeTitle: certificate.badgeTitle,
          issueDate: certificate.issuedAt,
          university: {
            name: mintLog.university.name,
            logoUrl: mintLog.university.logoUrl,
            isVerified: mintLog.university.status === 'APPROVED',
          },
          studentName: certificate.student.fullName,
          degreeType: certificate.degreeType,
        },
        revocationInfo: {
          isRevoked: false,
          revokedAt: null,
          reason: null,
        },
        blockchainProof: {
          mintAddress: certificate.mintAddress,
          transactionSignature: certificate.transactionSignature || '',
          merkleTreeAddress: certificate.merkleTreeAddress || '',
          metadataUri: certificate.ipfsMetadataUri,
          verifiedAt: new Date(),
        },
        verificationTimestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error, certificateNumber, mintAddress }, 'Error during certificate verification');
      
      throw new GraphQLError('Verification failed', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  },
};

