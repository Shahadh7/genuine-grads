import { GraphQLError } from 'graphql';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb, requireStudent } from '../../context.js';
import { hashNIC } from '../../../utils/crypto.js';
import { sharedDb } from '../../../db/shared.client.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { logger } from '../../../utils/logger.js';

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
        enrollments: {
          include: {
            course: true,
          },
          orderBy: {
            createdAt: 'desc',
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

    // Find students with enrollments that don't have valid certificates
    // A student can have multiple enrollments, each needing its own certificate
    // We only consider PENDING or MINTED certificates as valid (FAILED certificates are ignored)
    const students = await universityDb.student.findMany({
      where: {
        isActive: true,
        enrollments: {
          some: {
            // At least one enrollment without a valid certificate (PENDING or MINTED)
            certificates: {
              none: {
                status: {
                  in: ['PENDING', 'MINTED'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take,
      skip,
      include: {
        certificates: {
          include: {
            enrollment: {
              include: {
                course: true,
              },
            },
          },
        },
        enrollments: {
          include: {
            course: true,
            achievements: true,
            certificates: {
              where: {
                status: {
                  in: ['PENDING', 'MINTED'],
                },
              },
            },
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

    console.log('=== DEBUG: studentsWithoutCertificates query ===');
    console.log('Found students:', students.length);
    students.forEach((student: any) => {
      console.log(`\nStudent: ${student.fullName} (${student.id})`);
      console.log(`  Total enrollments: ${student.enrollments?.length ?? 0}`);
      student.enrollments?.forEach((enrollment: any) => {
        console.log(`    - Enrollment: ${enrollment.course?.name} (${enrollment.id})`);
        console.log(`      Certificates: ${enrollment.certificates?.length ?? 0}`);
        enrollment.certificates?.forEach((cert: any) => {
          console.log(`        * ${cert.certificateNumber} - ${cert.status}`);
        });
      });
    });
    console.log('=== END DEBUG ===\n');

    return students;
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

  /**
   * Get current student profile (for logged-in students)
   * Aggregates data from ALL universities where this student is enrolled
   */
  async meStudent(_: any, __: any, context: GraphQLContext) {
    const student = requireStudent(context);

    if (!student.walletAddress) {
      throw new GraphQLError('Student wallet address not found', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Get all universities where this student is enrolled
    const universities = await sharedDb.university.findMany({
      where: {
        status: 'APPROVED',
        databaseUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        databaseUrl: true,
      },
    });

    // Aggregate student data from all universities
    let primaryStudent: any = null;
    const allCertificates: any[] = [];
    const allEnrollments: any[] = [];
    const allAchievements: any[] = [];

    for (const university of universities) {
      if (!university.databaseUrl) continue;

      try {
        const universityDb = getUniversityDb(university.databaseUrl);

        // Check if student exists in this university
        const uniStudent = await universityDb.student.findUnique({
          where: { walletAddress: student.walletAddress },
          include: {
            certificates: {
              orderBy: { issuedAt: 'desc' },
            },
            enrollments: {
              include: {
                course: true,
                achievements: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            achievements: {
              include: {
                achievement: true,
              },
              orderBy: { awardedAt: 'desc' },
            },
          },
        });

        if (uniStudent) {
          // Use the first student record found as primary
          if (!primaryStudent) {
            primaryStudent = {
              id: uniStudent.id,
              email: uniStudent.email,
              fullName: uniStudent.fullName,
              studentNumber: uniStudent.studentNumber,
              walletAddress: uniStudent.walletAddress,
              program: uniStudent.program,
              department: uniStudent.department,
              enrollmentYear: uniStudent.enrollmentYear,
              graduationYear: uniStudent.graduationYear,
              profilePicUrl: uniStudent.profilePicUrl,
              isActive: uniStudent.isActive,
              createdAt: uniStudent.createdAt,
            };
          }

          // Aggregate certificates, enrollments, and achievements
          allCertificates.push(...(uniStudent.certificates || []));
          allEnrollments.push(...(uniStudent.enrollments || []));
          allAchievements.push(...(uniStudent.achievements || []));
        }
      } catch (error) {
        // Skip universities where we can't connect or student doesn't exist
        logger.error({ error, university: university.name }, 'Error fetching student from university');
      }
    }

    if (!primaryStudent) {
      throw new GraphQLError('Student not found in any university', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Return aggregated student data
    return {
      ...primaryStudent,
      certificates: allCertificates,
      enrollments: allEnrollments,
      achievements: allAchievements,
    };
  },

  /**
   * Get certificates for current student from MintActivityLog
   * This includes ALL certificates minted across ALL universities
   */
  async myCertificates(_: any, __: any, context: GraphQLContext) {
    const student = requireStudent(context);

    if (!student.walletAddress) {
      throw new GraphQLError('Student wallet address not found', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Fetch ALL certificates from MintActivityLog (shared database)
    // This includes certificates from all universities
    const mintLogs = await sharedDb.mintActivityLog.findMany({
      where: {
        studentWallet: student.walletAddress,
      },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            databaseUrl: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Transform MintActivityLog to Certificate format, enriching with university DB data
    const certificates = await Promise.all(
      mintLogs.map(async (log: any) => {
        let parsedMetadata = null;
        let ipfsMetadataUri = log.ipfsUri;
        let revoked = false;
        let revokedAt = null;
        let revocationReason = null;

        // Try to fetch certificate from university database for complete data
        let achievementIds: string[] = [];
        if (log.university.databaseUrl) {
          try {
            const universityDb = getUniversityDb(log.university.databaseUrl);
            const cert = await universityDb.certificate.findUnique({
              where: { mintAddress: log.mintAddress },
            });

            if (cert) {
              // Use the real IPFS URI from university database
              ipfsMetadataUri = cert.ipfsMetadataUri || log.ipfsUri;

              // Get revocation status from university database
              revoked = cert.revoked || false;
              revokedAt = cert.revokedAt;
              revocationReason = cert.revocationReason;

              // Get achievement IDs
              achievementIds = cert.achievementIds || [];

              // Parse metadata from university database (more complete)
              if (cert.metadataJson) {
                try {
                  parsedMetadata = typeof cert.metadataJson === 'string'
                    ? JSON.parse(cert.metadataJson)
                    : cert.metadataJson;
                } catch (error) {
                  logger.error({ error, certificateId: cert.id }, 'Failed to parse metadataJson from university DB');
                }
              }

              // If achievementIds exist, fetch achievement titles and add to metadata
              if (achievementIds.length > 0) {
                try {
                  const achievements = await universityDb.achievement.findMany({
                    where: { id: { in: achievementIds } },
                    select: { badgeTitle: true },
                  });
                  const achievementTitles = achievements.map((a: any) => a.badgeTitle);

                  // Add achievements to metadata for frontend use
                  if (!parsedMetadata) {
                    parsedMetadata = {};
                  }
                  if (!parsedMetadata.properties) {
                    parsedMetadata.properties = {};
                  }
                  parsedMetadata.properties.achievements = achievementTitles;
                } catch (error) {
                  logger.warn({ error, certificateId: cert.id }, 'Failed to fetch achievements for certificate');
                }
              }
            }
          } catch (error) {
            logger.warn({ error, universityId: log.universityId }, 'Failed to fetch certificate from university DB');
          }
        }

        // Fallback to MintActivityLog metadata if university DB fetch failed
        if (!parsedMetadata && log.metadataJson) {
          try {
            parsedMetadata = JSON.parse(log.metadataJson);
          } catch (error) {
            logger.error({ error, certificateId: log.id }, 'Failed to parse metadataJson from MintActivityLog');
          }
        }

        return {
          id: log.id,
          certificateNumber: log.certificateNumber || '',
          badgeTitle: log.badgeTitle,
          description: null,
          degreeType: null,
          mintAddress: log.mintAddress,
          merkleTreeAddress: log.merkleTreeAddress,
          ipfsMetadataUri,
          transactionSignature: log.transactionSignature,
          // Map MintStatus (SUCCESS) to CertificateStatus (MINTED)
          status: log.status === 'SUCCESS' ? 'MINTED' : log.status,
          issuedAt: log.timestamp,
          revoked,
          revokedAt,
          revocationReason,
          // Required relations (mock data)
          student: null, // Will be populated by GraphQL resolver if needed
          enrollment: null,
          metadata: parsedMetadata,
          achievementIds,
          // Extra fields for UI
          universityId: log.universityId,
          universityName: log.university.name,
          universityLogo: log.university.logoUrl,
        };
      })
    );

    return certificates;
  },

  /**
   * Get achievements for current student from ALL universities
   */
  async myAchievements(_: any, __: any, context: GraphQLContext) {
    const student = requireStudent(context);

    if (!student.walletAddress) {
      throw new GraphQLError('Student wallet address not found', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Get all universities where this student is enrolled
    const universities = await sharedDb.university.findMany({
      where: {
        status: 'APPROVED',
        databaseUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        databaseUrl: true,
      },
    });

    // Aggregate achievements from all universities
    const allAchievements: any[] = [];

    for (const university of universities) {
      if (!university.databaseUrl) continue;

      try {
        const universityDb = getUniversityDb(university.databaseUrl);

        // Check if student exists in this university
        const uniStudent = await universityDb.student.findUnique({
          where: { walletAddress: student.walletAddress },
          select: { id: true },
        });

        if (uniStudent) {
          // Fetch achievements from this university
          const achievements = await universityDb.studentAchievement.findMany({
            where: {
              studentId: uniStudent.id,
            },
            include: {
              achievement: true,
            },
            orderBy: {
              awardedAt: 'desc',
            },
          });

          // Add university info to each achievement
          const achievementsWithUni = achievements.map((ach: any) => ({
            ...ach,
            universityName: university.name,
            universityId: university.id,
          }));

          allAchievements.push(...achievementsWithUni);
        }
      } catch (error) {
        // Skip universities where we can't connect or student doesn't exist
        logger.error({ error, university: university.name }, 'Error fetching achievements from university');
      }
    }

    // Sort all achievements by awardedAt
    allAchievements.sort((a, b) => {
      const dateA = new Date(a.awardedAt).getTime();
      const dateB = new Date(b.awardedAt).getTime();
      return dateB - dateA; // Descending order
    });

    return allAchievements;
  },

  /**
   * Get verification logs for current student from ALL universities
   */
  async myVerificationLogs(
    _: any,
    { limit = 50, offset = 0 }: { limit?: number; offset?: number },
    context: GraphQLContext
  ) {
    const student = requireStudent(context);

    if (!student.walletAddress) {
      throw new GraphQLError('Student wallet address not found', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Get all universities where this student is enrolled
    const universities = await sharedDb.university.findMany({
      where: {
        status: 'APPROVED',
        databaseUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        databaseUrl: true,
      },
    });

    // Aggregate verification logs from all universities
    const allLogs: any[] = [];

    for (const university of universities) {
      if (!university.databaseUrl) continue;

      try {
        const universityDb = getUniversityDb(university.databaseUrl);

        // Check if student exists in this university
        const uniStudent = await universityDb.student.findUnique({
          where: { walletAddress: student.walletAddress },
          select: { id: true },
        });

        if (uniStudent) {
          // Fetch verification logs from this university
          const logs = await universityDb.verificationLog.findMany({
            where: {
              studentId: uniStudent.id,
            },
            include: {
              certificate: {
                select: {
                  id: true,
                  certificateNumber: true,
                  badgeTitle: true,
                  mintAddress: true,
                  status: true,
                  issuedAt: true,
                },
              },
            },
            orderBy: {
              verifiedAt: 'desc',
            },
          });

          // Add university info to each log
          const logsWithUni = logs.map((log: any) => ({
            ...log,
            universityName: university.name,
            universityId: university.id,
          }));

          allLogs.push(...logsWithUni);
        }
      } catch (error) {
        // Skip universities where we can't connect or student doesn't exist
        logger.error(`Error fetching verification logs from university ${university.name}:`, error);
      }
    }

    // Sort all logs by verifiedAt
    allLogs.sort((a, b) => {
      const dateA = new Date(a.verifiedAt).getTime();
      const dateB = new Date(b.verifiedAt).getTime();
      return dateB - dateA; // Descending order
    });

    // Apply pagination
    const paginatedLogs = allLogs.slice(offset, offset + Math.min(limit, 100));

    return paginatedLogs;
  },

  /**
   * Get verification log statistics for current student
   */
  async myVerificationLogStats(_: any, __: any, context: GraphQLContext) {
    const student = requireStudent(context);

    if (!student.walletAddress) {
      throw new GraphQLError('Student wallet address not found', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Get all universities where this student is enrolled
    const universities = await sharedDb.university.findMany({
      where: {
        status: 'APPROVED',
        databaseUrl: { not: null },
      },
      select: {
        databaseUrl: true,
      },
    });

    let totalCount = 0;
    let successfulCount = 0;
    let failedCount = 0;

    for (const university of universities) {
      if (!university.databaseUrl) continue;

      try {
        const universityDb = getUniversityDb(university.databaseUrl);

        // Check if student exists in this university
        const uniStudent = await universityDb.student.findUnique({
          where: { walletAddress: student.walletAddress },
          select: { id: true },
        });

        if (uniStudent) {
          // Count verification logs
          const [total, successful, failed] = await Promise.all([
            universityDb.verificationLog.count({
              where: { studentId: uniStudent.id },
            }),
            universityDb.verificationLog.count({
              where: {
                studentId: uniStudent.id,
                verificationStatus: 'SUCCESS',
              },
            }),
            universityDb.verificationLog.count({
              where: {
                studentId: uniStudent.id,
                verificationStatus: 'FAILED',
              },
            }),
          ]);

          totalCount += total;
          successfulCount += successful;
          failedCount += failed;
        }
      } catch (error) {
        // Skip universities where we can't connect
        logger.error('Error fetching verification stats from university:', error);
      }
    }

    return {
      total: totalCount,
      successful: successfulCount,
      failed: failedCount,
    };
  },
};

