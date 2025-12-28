import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../../context.js';
import { sharedDb } from '../../../db/shared.client.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { logger } from '../../../utils/logger.js';
import { env } from '../../../env.js';
import { getAssetOnChainStatus } from '../../../services/helius/helius.client.js';

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
            transactionSignature: revokedCert.transactionSignature,
          },
          blockchainProof: {
            mintAddress: revokedCert.mintAddress,
            transactionSignature: revokedCert.transactionSignature,
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

      // Check if mint is still pending - treat as not found
      if (mintLog.status === 'PENDING') {
        logger.info(
          { certificateNumber, mintAddress, status: mintLog.status },
          'Certificate mint is still pending - treating as not found'
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

      // Log verification attempt in the database
      // Check if there's a recent log entry (within last 5 seconds) to prevent duplicates
      try {
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const recentLog = await universityDb.verificationLog.findFirst({
          where: {
            certificateId: certificate.id,
            verifierIpAddress: context.req.ip || 'unknown',
            verifiedAt: {
              gte: fiveSecondsAgo,
            },
          },
          orderBy: {
            verifiedAt: 'desc',
          },
        });

        if (!recentLog) {
          await universityDb.verificationLog.create({
            data: {
              studentId: certificate.studentId,
              certificateId: certificate.id,
              verifiedAt: new Date(),
              verificationType: 'PUBLIC',
              verificationStatus: certificate.revoked ? 'FAILED' : 'SUCCESS',
              verifierIpAddress: context.req.ip || 'unknown',
              verifierUserAgent: context.req.headers['user-agent'] || null,
              certificateNumber: certificate.certificateNumber,
              mintAddress: certificate.mintAddress,
              errorMessage: certificate.revoked ? `Certificate revoked: ${certificate.revocationReason}` : null,
            },
          });
          logger.info({ certificateId: certificate.id }, 'Verification log created');
        } else {
          logger.info({ certificateId: certificate.id }, 'Skipped duplicate verification log (recent entry exists)');
        }
      } catch (logError) {
        // Don't fail verification if logging fails
        logger.error({ error: logError, certificateId: certificate.id }, 'Failed to create verification log');
      }

      // Parse metadata to extract achievements
      let achievements: string[] = [];
      if (certificate.metadataJson) {
        try {
          const metadata = typeof certificate.metadataJson === 'string'
            ? JSON.parse(certificate.metadataJson)
            : certificate.metadataJson;

          // Extract achievements from metadata properties or achievementIds array
          if (metadata.properties?.achievements) {
            achievements = metadata.properties.achievements;
          } else if (certificate.achievementIds && certificate.achievementIds.length > 0) {
            // If achievements are stored in achievementIds, fetch their titles
            const achievementRecords = await universityDb.achievement.findMany({
              where: {
                id: { in: certificate.achievementIds },
              },
              select: {
                badgeTitle: true,
              },
            });
            achievements = achievementRecords.map((a: any) => a.badgeTitle);
          }
        } catch (error) {
          logger.warn({ error, certificateId: certificate.id }, 'Failed to parse metadataJson for achievements');
        }
      }

      // Check if revoked (double check at university level)
      if (certificate.revoked) {
        // Get revocation transaction signature from certificate or shared index
        const revocationTxSig = (certificate as any).revocationTransactionSignature || null;

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
            achievements,
          },
          revocationInfo: {
            isRevoked: true,
            revokedAt: certificate.revokedAt,
            reason: certificate.revocationReason,
            transactionSignature: revocationTxSig,
          },
          blockchainProof: {
            mintAddress: certificate.mintAddress,
            transactionSignature: revocationTxSig || certificate.transactionSignature,
            merkleTreeAddress: certificate.merkleTreeAddress,
            metadataUri: certificate.ipfsMetadataUri,
            verifiedAt: new Date(),
          },
          verificationTimestamp: new Date(),
        };
      }

      // Step 4: Verify on-chain using Helius DAS API
      // Check if the certificate NFT has been burned on-chain
      if (certificate.mintAddress) {
        try {
          const onChainStatus = await getAssetOnChainStatus(certificate.mintAddress);

          logger.info(
            {
              mintAddress: certificate.mintAddress,
              onChainStatus,
            },
            'On-chain verification status'
          );

          // If asset is burned on-chain but not marked as revoked in DB,
          // update verification log and return revoked status
          if (onChainStatus.burnt) {
            // Try to find revocation info from shared index
            const revokedInfo = await sharedDb.revokedCertIndex.findUnique({
              where: { mintAddress: certificate.mintAddress },
            });

            // Update verification log to indicate burnt on-chain
            try {
              await universityDb.verificationLog.create({
                data: {
                  studentId: certificate.studentId,
                  certificateId: certificate.id,
                  verifiedAt: new Date(),
                  verificationType: 'PUBLIC',
                  verificationStatus: 'FAILED',
                  verifierIpAddress: context.req.ip || 'unknown',
                  verifierUserAgent: context.req.headers['user-agent'] || null,
                  certificateNumber: certificate.certificateNumber,
                  mintAddress: certificate.mintAddress,
                  errorMessage: 'Certificate NFT burned on-chain',
                },
              });
            } catch (logErr) {
              // Ignore duplicate log errors
            }

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
                achievements,
              },
              revocationInfo: {
                isRevoked: true,
                revokedAt: revokedInfo?.revokedAt || null,
                reason: revokedInfo?.reason || 'Certificate burned on-chain',
                transactionSignature: revokedInfo?.transactionSignature || null,
              },
              blockchainProof: {
                mintAddress: certificate.mintAddress,
                transactionSignature: revokedInfo?.transactionSignature || certificate.transactionSignature,
                merkleTreeAddress: certificate.merkleTreeAddress,
                metadataUri: certificate.ipfsMetadataUri,
                verifiedAt: new Date(),
              },
              verificationTimestamp: new Date(),
            };
          }
        } catch (onChainError) {
          // Log but don't fail verification if on-chain check fails
          logger.warn(
            { error: onChainError, mintAddress: certificate.mintAddress },
            'Failed to check on-chain status, continuing with DB verification'
          );
        }
      }

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
          achievements,
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

  /**
   * PUBLIC: Get super admin wallet address for validation
   */
  async getSuperAdminWallet() {
    return env.SOLANA_SUPER_ADMIN_PUBKEY;
  },
};

