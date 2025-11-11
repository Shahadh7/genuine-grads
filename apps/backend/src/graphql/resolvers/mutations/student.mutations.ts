import { GraphQLError } from 'graphql';
import { PublicKey } from '@solana/web3.js';
import { sharedDb } from '../../../db/shared.client.js';
import { hashNIC, encrypt } from '../../../utils/crypto.js';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { logger } from '../../../utils/logger.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function normalizeTitle(title: string): string {
  return title.trim();
}

async function resolveStudentAchievementInputs(
  universityDb: any,
  inputs?: StudentAchievementInput[] | null
): Promise<
  Array<{
    achievementId: string;
    notes?: string | null;
    awardedAt?: Date;
  }>
> {
  if (!inputs || inputs.length === 0) {
    return [];
  }

  const payload: Array<{
    achievementId: string;
    notes?: string | null;
    awardedAt?: Date;
  }> = [];

  for (const item of inputs) {
    if (!item) continue;

    const notes = item.notes?.trim() || null;
    let awardedAt: Date | undefined;

    if (item.awardedAt) {
      const parsed = new Date(item.awardedAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new GraphQLError(`Invalid awardedAt value for achievement: ${item.awardedAt}`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      awardedAt = parsed;
    }

    if (item.id) {
      const achievement = await universityDb.achievementCatalog.findUnique({
        where: { id: item.id },
      });

      if (!achievement) {
        throw new GraphQLError(`Achievement with id ${item.id} not found`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      payload.push({
        achievementId: achievement.id,
        notes,
        awardedAt,
      });
      continue;
    }

    const title = item.title ? normalizeTitle(item.title) : '';
    if (!title) {
      throw new GraphQLError('Achievement title is required when id is not provided', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    let achievement = await universityDb.achievementCatalog.findUnique({
      where: { title },
    });

    if (!achievement) {
      achievement = await universityDb.achievementCatalog.create({
        data: {
          title,
          description: item.description?.trim() || null,
          category: item.category?.trim() || null,
        },
      });
    } else if (item.description && !achievement.description) {
      achievement = await universityDb.achievementCatalog.update({
        where: { id: achievement.id },
        data: {
          description: item.description?.trim() || achievement.description,
          category: item.category?.trim() || achievement.category,
        },
      });
    }

    payload.push({
      achievementId: achievement.id,
      notes,
      awardedAt,
    });
  }

  return payload;
}

async function ensureAchievementCatalogIds(
  universityDb: any,
  titles: string[],
  cache: Map<string, string>
): Promise<Map<string, string>> {
  const normalized = Array.from(
    new Set(
      titles
        .map((title) => normalizeTitle(title))
        .filter((title) => title.length > 0)
    )
  );

  if (normalized.length === 0) {
    return cache;
  }

  const missing: string[] = [];

  for (const title of normalized) {
    const key = title.toLowerCase();
    if (cache.has(key)) {
      continue;
    }

    const existing = await universityDb.achievementCatalog.findUnique({
      where: { title },
    });

    if (existing) {
      cache.set(key, existing.id);
    } else {
      missing.push(title);
    }
  }

  for (const title of missing) {
    const created = await universityDb.achievementCatalog.create({
      data: { title },
    });
    cache.set(title.toLowerCase(), created.id);
  }

  return cache;
}

interface StudentAchievementInput {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  awardedAt?: string | null;
}

interface RegisterStudentInput {
  email: string;
  fullName: string;
  studentNumber: string;
  nationalId: string;
  walletAddress?: string;
  program?: string;
  department?: string;
  enrollmentYear?: number;
  achievements?: StudentAchievementInput[] | null;
}

interface UpdateStudentInput {
  email?: string;
  fullName?: string;
  walletAddress?: string;
  program?: string;
  department?: string;
  graduationYear?: number;
}

export const studentMutations = {
  /**
   * Register a new student in university database
   * Also checks/creates entry in GlobalStudentIndex
   */
  async registerStudent(_: any, { input }: { input: RegisterStudentInput }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const {
      email,
      fullName,
      studentNumber,
      nationalId,
      program,
      department,
      enrollmentYear,
      achievements,
    } = input;

    let walletAddress = input.walletAddress;

    // Hash the National ID for privacy
    const nicHash = hashNIC(nationalId);

    // Check if student already exists in THIS university
    const existingInUniversity = await universityDb.student.findFirst({
      where: {
        OR: [{ email }, { studentNumber }, { nicHash }],
      },
    });

    if (existingInUniversity) {
      throw new GraphQLError('Student already exists in your university (duplicate email, student number, or NIC)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Check global student index
    let globalIndex = await sharedDb.globalStudentIndex.findUnique({
      where: { nicHash },
      include: {
        createdByUniversity: {
          select: { name: true },
        },
      },
    });

    // If student exists globally but with different wallet, handle it
    if (globalIndex) {
      logger.info(
        {
          nicHash,
          existingUniversity: globalIndex.createdByUniversity.name,
          newUniversity: context.admin!.universityId,
        },
        'Student already registered in another university'
      );

      // If wallet addresses don't match and global index has a wallet, warn
      if (globalIndex.walletAddress && walletAddress && globalIndex.walletAddress !== walletAddress) {
        logger.warn({ nicHash }, 'Wallet address mismatch with global index');
        // Still allow registration but use the wallet from global index
      }

      // Use existing wallet from global index if available
      if (globalIndex.walletAddress && !walletAddress) {
        walletAddress = globalIndex.walletAddress;
      }
    } else {
      // Create new entry in global student index
      globalIndex = await sharedDb.globalStudentIndex.create({
        data: {
          nicHash,
          walletAddress,
          encryptedEmail: encrypt(email), // Store encrypted email for support purposes
          createdByUniversityId: context.admin!.universityId!,
        },
        include: {
          createdByUniversity: {
            select: { name: true },
          },
        },
      });

      logger.info(
        {
          nicHash,
          universityId: context.admin!.universityId,
        },
        'New student added to global index'
      );
    }

    const achievementPayloads = await resolveStudentAchievementInputs(universityDb, achievements);

    // Create student in university database
    const student = await universityDb.student.create({
      data: {
        email,
        fullName,
        studentNumber,
        nicHash,
        walletAddress: walletAddress || globalIndex.walletAddress,
        program,
        department,
        enrollmentYear,
        achievements:
          achievementPayloads.length > 0
            ? {
                create: achievementPayloads.map(({ achievementId, notes, awardedAt }) => ({
                  achievement: {
                    connect: { id: achievementId },
                  },
                  ...(notes ? { notes } : {}),
                  ...(awardedAt ? { awardedAt } : {}),
                })),
              }
            : undefined,
      },
    });

    logger.info(
      {
        studentId: student.id,
        universityId: context.admin!.universityId,
        email: student.email,
      },
      'Student registered'
    );

    return student;
  },

  /**
   * Bulk import students with server-side validation.
   * Expects pre-parsed rows from the frontend (CSV handled client-side).
   */
  async bulkImportStudents(
    _: any,
    {
      input,
    }: {
      input: {
        students: Array<{
          rowNumber: number;
          fullName: string;
          email: string;
          studentNumber: string;
          nationalId: string;
          walletAddress?: string | null;
          program?: string | null;
          department?: string | null;
          enrollmentYear?: number | null;
          achievements?: string[] | null;
        }>;
        overwriteWalletFromGlobalIndex?: boolean | null;
      };
    },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    if (!input?.students || input.students.length === 0) {
      throw new GraphQLError('No student rows provided for import', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const seenEmails = new Map<string, number>();
    const seenStudentNumbers = new Map<string, number>();
    const seenNicHashes = new Map<string, number>();

    const failures: Array<{
      rowNumber: number;
      message: string;
      field?: string;
      email?: string;
      studentNumber?: string;
    }> = [];

    let successCount = 0;

    const overwriteWithGlobalWallet = input.overwriteWalletFromGlobalIndex ?? false;
    const achievementCache = new Map<string, string>();

    for (const row of input.students) {
      const rowNumber = row.rowNumber ?? 0;
      const fullName = row.fullName?.trim();
      const emailRaw = row.email?.trim();
      const email = emailRaw ? emailRaw.toLowerCase() : '';
      const studentNumber = row.studentNumber?.trim();
      const nationalId = row.nationalId?.trim();
      const program = row.program?.trim() || undefined;
      const department = row.department?.trim() || undefined;
      const enrollmentYear = row.enrollmentYear ?? undefined;
      const walletAddressInput = row.walletAddress?.trim() || undefined;
      const achievementTitles =
        Array.isArray(row.achievements) && row.achievements.length > 0
          ? row.achievements
              .map((title) => (typeof title === 'string' ? title.trim() : ''))
              .filter((title) => title.length > 0)
          : [];

      const addFailure = (message: string, field?: string) => {
        failures.push({
          rowNumber,
          message,
          field,
          email: row.email ?? undefined,
          studentNumber,
        });
      };

      if (!fullName) {
        addFailure('Full name is required', 'fullName');
        continue;
      }

      if (!email) {
        addFailure('Email is required', 'email');
        continue;
      }

      if (!isValidEmail(email)) {
        addFailure('Invalid email format', 'email');
        continue;
      }

      if (!studentNumber) {
        addFailure('Student number is required', 'studentNumber');
        continue;
      }

      if (!nationalId) {
        addFailure('National ID is required', 'nationalId');
        continue;
      }

      const nicHash = hashNIC(nationalId);

      if (seenEmails.has(email)) {
        addFailure(`Duplicate email in upload (also used in row ${seenEmails.get(email)})`, 'email');
        continue;
      }
      seenEmails.set(email, rowNumber);

      if (seenStudentNumbers.has(studentNumber)) {
        addFailure(
          `Duplicate student number in upload (also used in row ${seenStudentNumbers.get(studentNumber)})`,
          'studentNumber'
        );
        continue;
      }
      seenStudentNumbers.set(studentNumber, rowNumber);

      if (seenNicHashes.has(nicHash)) {
        addFailure(
          `Duplicate national ID in upload (also used in row ${seenNicHashes.get(nicHash)})`,
          'nationalId'
        );
        continue;
      }
      seenNicHashes.set(nicHash, rowNumber);

      let normalizedWallet: string | undefined;
      if (walletAddressInput) {
        try {
          normalizedWallet = new PublicKey(walletAddressInput).toBase58();
        } catch {
          addFailure('Invalid Solana wallet address', 'walletAddress');
          continue;
        }
      }

      try {
        const existingInUniversity = await universityDb.student.findFirst({
          where: {
            OR: [{ email }, { studentNumber }, { nicHash }],
          },
        });

        if (existingInUniversity) {
          throw new GraphQLError(
            'Student already exists in your university (duplicate email, student number, or NIC)',
            {
              extensions: { code: 'BAD_USER_INPUT', field: 'email' },
            }
          );
        }

        let globalIndex = await sharedDb.globalStudentIndex.findUnique({
          where: { nicHash },
        });

        if (globalIndex) {
          if (globalIndex.walletAddress) {
            if (normalizedWallet && globalIndex.walletAddress !== normalizedWallet && !overwriteWithGlobalWallet) {
              logger.warn(
                {
                  nicHash,
                  providedWallet: normalizedWallet,
                  globalWallet: globalIndex.walletAddress,
                  rowNumber,
                },
                'Wallet mismatch with global index, defaulting to existing global wallet'
              );
            }

            normalizedWallet = overwriteWithGlobalWallet
              ? globalIndex.walletAddress
              : normalizedWallet ?? globalIndex.walletAddress;
          } else if (normalizedWallet && overwriteWithGlobalWallet) {
            globalIndex = await sharedDb.globalStudentIndex.update({
              where: { nicHash },
              data: { walletAddress: normalizedWallet },
            });
          }
        } else {
          globalIndex = await sharedDb.globalStudentIndex.create({
            data: {
              nicHash,
              walletAddress: normalizedWallet,
              encryptedEmail: encrypt(email),
              createdByUniversityId: context.admin!.universityId!,
            },
          });
        }

        const student = await universityDb.student.create({
          data: {
            email,
            fullName,
            studentNumber,
            nicHash,
            walletAddress: normalizedWallet ?? globalIndex.walletAddress,
            program,
            department,
            enrollmentYear,
          },
        });

        if (achievementTitles.length > 0) {
          await ensureAchievementCatalogIds(universityDb, achievementTitles, achievementCache);

          const data = achievementTitles
            .map((title) => {
              const key = title.toLowerCase();
              const achievementId = achievementCache.get(key);
              if (!achievementId) {
                return null;
              }
              return {
                studentId: student.id,
                achievementId,
              };
            })
            .filter((entry): entry is { studentId: string; achievementId: string } => !!entry);

          if (data.length > 0) {
            await universityDb.studentAchievement.createMany({
              data,
              skipDuplicates: true,
            });
          }
        }

        successCount += 1;
      } catch (error: any) {
        logger.error(
          {
            error: error?.message,
            rowNumber,
            email,
            studentNumber,
            universityId: context.admin!.universityId,
          },
          'Failed to bulk import student row'
        );

        const message = error instanceof GraphQLError ? error.message : 'Failed to import student';
        const field =
          error instanceof GraphQLError ? (error.extensions?.field as string | undefined) : undefined;

        addFailure(message, field);
      }
    }

    return {
      successCount,
      failureCount: failures.length,
      failures,
    };
  },

  /**
   * Update student information
   */
  async updateStudent(
    _: any,
    { id, input }: { id: string; input: UpdateStudentInput },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    // Check if student exists
    const existing = await universityDb.student.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // If email is being updated, check for duplicates
    if (input.email && input.email !== existing.email) {
      const duplicate = await universityDb.student.findUnique({
        where: { email: input.email },
      });

      if (duplicate) {
        throw new GraphQLError('Email already in use', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    // Update student
    const updated = await universityDb.student.update({
      where: { id },
      data: {
        ...(input.email && { email: input.email }),
        ...(input.fullName && { fullName: input.fullName }),
        ...(input.walletAddress !== undefined && { walletAddress: input.walletAddress }),
        ...(input.program && { program: input.program }),
        ...(input.department && { department: input.department }),
        ...(input.graduationYear && { graduationYear: input.graduationYear }),
      },
    });

    // If wallet address is updated, update global index too
    if (input.walletAddress && input.walletAddress !== existing.walletAddress) {
      await sharedDb.globalStudentIndex.update({
        where: { nicHash: existing.nicHash },
        data: { walletAddress: input.walletAddress },
      });
    }

    logger.info({ studentId: id }, 'Student updated');

    return updated;
  },

  /**
   * Delete/deactivate a student
   */
  async deleteStudent(_: any, { id }: { id: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    // Check if student exists
    const existing = await universityDb.student.findUnique({
      where: { id },
      include: {
        certificates: true,
      },
    });

    if (!existing) {
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Prevent deletion if student has certificates
    if (existing.certificates.length > 0) {
      throw new GraphQLError('Cannot delete student with issued certificates. Deactivate instead.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Soft delete by deactivating
    await universityDb.student.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ studentId: id }, 'Student deactivated');

    return true;
  },
};

