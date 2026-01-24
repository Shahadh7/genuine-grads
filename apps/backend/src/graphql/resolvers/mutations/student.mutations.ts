import { GraphQLError } from 'graphql';
import { PublicKey } from '@solana/web3.js';
import { sharedDb } from '../../../db/shared.client.js';
import { hashNIC, encrypt } from '../../../utils/crypto.js';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { logger } from '../../../utils/logger.js';
import { validateNIC } from '../../../utils/nic-validator.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function normalizeTitle(title: string): string {
  return title.trim();
}

function normalizeCourseCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-');
}

type ResolvedAchievementInput = {
  achievementId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  awardedAt?: Date;
};

async function resolveStudentAchievementInputs(
  universityDb: any,
  inputs?: StudentAchievementInput[] | null
): Promise<ResolvedAchievementInput[]> {
  if (!inputs || inputs.length === 0) {
    return [];
  }

  const payload: ResolvedAchievementInput[] = [];

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
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
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
    } else if (item.description || item.category) {
      achievement = await universityDb.achievementCatalog.update({
        where: { id: achievement.id },
        data: {
          ...(item.description ? { description: item.description.trim() } : {}),
          ...(item.category ? { category: item.category.trim() } : {}),
        },
      });
    }

    payload.push({
      achievementId: achievement.id,
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      notes,
      awardedAt,
    });
  }

  return payload;
}

interface StudentAchievementInput {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  awardedAt?: string | null;
}

interface StudentCourseInput {
  code: string;
  name: string;
  description?: string | null;
  credits?: number | null;
  semester?: string | null;
  department: string;
  degreeType: string;
}

interface StudentEnrollmentInput {
  course: StudentCourseInput;
  batchYear: number;
  semester?: string | null;
  status?: string | null;
  gpa?: number | null;
  grade?: string | null;
}

interface RegisterStudentInput {
  email: string;
  fullName: string;
  studentNumber: string;
  nationalId: string;
  walletAddress: string;
  program: string;
  department: string;
  enrollmentYear: number;
  primaryEnrollment: StudentEnrollmentInput;
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

interface EnrollStudentInCourseInput {
  studentId: string;
  course: StudentCourseInput;
  batchYear: number;
  semester?: string | null;
  status?: string | null;
  gpa?: number | null;
  grade?: string | null;
  achievements?: StudentAchievementInput[] | null;
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
      primaryEnrollment,
      achievements,
    } = input;

    if (!primaryEnrollment || !primaryEnrollment.course) {
      throw new GraphQLError('Primary enrollment details are required for registration', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new GraphQLError('Invalid email format', {
        extensions: { code: 'BAD_USER_INPUT', field: 'email' },
      });
    }

    const sanitizedFullName = fullName.trim();
    const sanitizedStudentNumber = studentNumber.trim();
    const sanitizedNationalId = nationalId.trim();
    const sanitizedProgram = program.trim();
    const sanitizedDepartment = department.trim();

    if (!sanitizedFullName || !sanitizedStudentNumber || !sanitizedNationalId) {
      throw new GraphQLError('Full name, student number, and national ID are required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Validate NIC format
    const nicValidation = validateNIC(sanitizedNationalId);
    if (!nicValidation.isValid) {
      throw new GraphQLError(nicValidation.error || 'Invalid NIC format', {
        extensions: { code: 'BAD_USER_INPUT', field: 'nationalId' },
      });
    }

    const { course, batchYear, gpa, grade } = primaryEnrollment;
    const courseCodeRaw = course.code?.trim();
    const courseName = course.name?.trim();
    const courseDegreeType = course.degreeType?.trim();
    const courseDepartment = course.department?.trim();

    if (!courseCodeRaw || !courseName || !courseDegreeType || !courseDepartment) {
      throw new GraphQLError('Course code, name, degree type, and department are required for the primary enrollment', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (!Number.isInteger(batchYear)) {
      throw new GraphQLError('Batch year must be an integer value', {
        extensions: { code: 'BAD_USER_INPUT', field: 'batchYear' },
      });
    }

    if (batchYear !== enrollmentYear) {
      logger.warn(
        { studentNumber: sanitizedStudentNumber, enrollmentYear, batchYear },
        'Batch year differs from enrollment year; proceeding with provided values'
      );
    }

    let normalizedWalletAddress: string;
    try {
      normalizedWalletAddress = new PublicKey(input.walletAddress.trim()).toBase58();
    } catch {
      throw new GraphQLError('Invalid Solana wallet address provided', {
        extensions: { code: 'BAD_USER_INPUT', field: 'walletAddress' },
      });
    }

    // Hash the National ID for privacy
    const nicHash = hashNIC(sanitizedNationalId);

    // Check if student already exists in THIS university by NIC hash (primary identifier)
    const existingStudentByNic = await universityDb.student.findUnique({
      where: { nicHash },
    });

    // If student exists by NIC, we'll add enrollment to existing student
    // But first check for conflicts with email/studentNumber from OTHER students
    if (!existingStudentByNic) {
      const conflictingStudent = await universityDb.student.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { studentNumber: sanitizedStudentNumber }],
        },
      });

      if (conflictingStudent) {
        throw new GraphQLError('Another student already uses this email or student number', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
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

    if (globalIndex) {
      if (globalIndex.walletAddress && globalIndex.walletAddress !== normalizedWalletAddress) {
        throw new GraphQLError(
          'Wallet address does not match existing record in the Global Student Index. Please verify the wallet with support.',
          {
            extensions: { code: 'BAD_USER_INPUT', field: 'walletAddress' },
          }
        );
      }

      if (!globalIndex.walletAddress) {
        globalIndex = await sharedDb.globalStudentIndex.update({
          where: { nicHash },
          data: { walletAddress: normalizedWalletAddress },
          include: {
            createdByUniversity: {
              select: { name: true },
            },
          },
        });
      }
    } else {
      globalIndex = await sharedDb.globalStudentIndex.create({
        data: {
          nicHash,
          walletAddress: normalizedWalletAddress,
          encryptedEmail: encrypt(normalizedEmail),
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

    const { student, isExistingStudent } = await universityDb.$transaction(async (tx: any) => {
      const achievementPayloads = await resolveStudentAchievementInputs(tx, achievements);

      const normalizedCourseCode = normalizeCourseCode(courseCodeRaw.length > 0 ? courseCodeRaw : courseName);
      const courseCreateData: any = {
        code: normalizedCourseCode,
        name: courseName,
        department: courseDepartment,
        level: courseDegreeType,
        isActive: true,
      };
      const courseUpdateData: any = {
        name: courseName,
        department: courseDepartment,
        level: courseDegreeType,
        isActive: true,
      };

      if (course.description?.trim()) {
        const desc = course.description.trim();
        courseCreateData.description = desc;
        courseUpdateData.description = desc;
      }

      if (typeof course.credits === 'number') {
        courseCreateData.credits = course.credits;
        courseUpdateData.credits = course.credits;
      }

      const courseRecord = await tx.course.upsert({
        where: { code: normalizedCourseCode },
        create: courseCreateData,
        update: courseUpdateData,
      });

      let studentRecord: any;
      let existingStudent = false;

      if (existingStudentByNic) {
        // Student already exists - use existing record
        studentRecord = existingStudentByNic;
        existingStudent = true;

        // Check if already enrolled in this course for this batch year
        const existingEnrollment = await tx.enrollment.findFirst({
          where: {
            studentId: studentRecord.id,
            courseId: courseRecord.id,
            batchYear,
          },
        });

        if (existingEnrollment) {
          throw new GraphQLError(
            `Student is already registered with the course "${courseName}" (${batchYear})`,
            {
              extensions: {
                code: 'DUPLICATE_ENROLLMENT',
                enrollmentId: existingEnrollment.id,
              },
            }
          );
        }
      } else {
        // Create new student
        studentRecord = await tx.student.create({
          data: {
            email: normalizedEmail,
            fullName: sanitizedFullName,
            studentNumber: sanitizedStudentNumber,
            nicHash,
            walletAddress: normalizedWalletAddress,
            program: sanitizedProgram,
            department: sanitizedDepartment,
            enrollmentYear,
          },
        });
      }

      const enrollmentRecord = await tx.enrollment.create({
        data: {
          studentId: studentRecord.id,
          courseId: courseRecord.id,
          batchYear,
          gpa: typeof gpa === 'number' ? gpa : null,
          grade: grade?.trim() || null,
        },
      });

      if (achievementPayloads.length > 0) {
        const studentAchievementData = achievementPayloads.map(({ achievementId, notes, awardedAt }) => {
          const entry: Record<string, any> = {
            studentId: studentRecord.id,
            achievementId,
          };

          if (notes) {
            entry.notes = notes;
          }

          if (awardedAt) {
            entry.awardedAt = awardedAt;
          }

          return entry;
        });

        if (studentAchievementData.length > 0) {
          await tx.studentAchievement.createMany({
            data: studentAchievementData,
            skipDuplicates: true,
          });
        }

        const enrollmentAchievementData = achievementPayloads.map(
          ({ title, description: achievementDescription, category, awardedAt }) => ({
            enrollmentId: enrollmentRecord.id,
            badgeTitle: title,
            description: achievementDescription ?? null,
            badgeType: category ?? null,
            semester: null,
            achievementDate: awardedAt ?? null,
          })
        );

        if (enrollmentAchievementData.length > 0) {
          await tx.achievement.createMany({
            data: enrollmentAchievementData,
          });
        }
      }

      return { student: studentRecord, isExistingStudent: existingStudent };
    });

    const studentWithRelations = await universityDb.student.findUnique({
      where: { id: student.id },
      include: {
        achievements: {
          include: {
            achievement: true,
          },
        },
        enrollments: {
          include: {
            course: true,
            achievements: true,
          },
        },
        certificates: true,
      },
    });

    logger.info(
      {
        studentId: student.id,
        universityId: context.admin!.universityId,
        email: normalizedEmail,
        isExistingStudent,
      },
      isExistingStudent ? 'Existing student enrolled in new course' : 'Student registered'
    );

    return studentWithRelations ?? student;
  },

  /**
   * Enroll an existing student in an additional course
   * Allows students to have multiple enrollments for different courses
   */
  async enrollStudentInCourse(
    _: any,
    { input }: { input: EnrollStudentInCourseInput },
    context: GraphQLContext
  ) {
    requireUniversityAdmin(context);
    const universityDb = requireUniversityDb(context);

    const {
      studentId,
      course,
      batchYear,
      gpa,
      grade,
      achievements,
    } = input;

    // Validate student exists
    const student = await universityDb.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new GraphQLError('Student not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Validate course details
    const courseCodeRaw = course.code?.trim();
    const courseName = course.name?.trim();
    const courseDegreeType = course.degreeType?.trim();
    const courseDepartment = course.department?.trim();

    if (!courseCodeRaw || !courseName || !courseDegreeType || !courseDepartment) {
      throw new GraphQLError('Course code, name, degree type, and department are required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (!Number.isInteger(batchYear)) {
      throw new GraphQLError('Batch year must be an integer value', {
        extensions: { code: 'BAD_USER_INPUT', field: 'batchYear' },
      });
    }

    // Process enrollment in transaction
    const enrollmentRecord = await universityDb.$transaction(async (tx: any) => {
      // Resolve achievements
      const achievementPayloads = await resolveStudentAchievementInputs(tx, achievements);

      // Create or update course
      const normalizedCourseCode = normalizeCourseCode(courseCodeRaw.length > 0 ? courseCodeRaw : courseName);
      const courseCreateData: any = {
        code: normalizedCourseCode,
        name: courseName,
        department: courseDepartment,
        level: courseDegreeType,
        isActive: true,
      };
      const courseUpdateData: any = {
        name: courseName,
        department: courseDepartment,
        level: courseDegreeType,
        isActive: true,
      };

      if (course.description?.trim()) {
        const desc = course.description.trim();
        courseCreateData.description = desc;
        courseUpdateData.description = desc;
      }

      if (typeof course.credits === 'number') {
        courseCreateData.credits = course.credits;
        courseUpdateData.credits = course.credits;
      }

      const courseRecord = await tx.course.upsert({
        where: { code: normalizedCourseCode },
        create: courseCreateData,
        update: courseUpdateData,
      });

      // Check for duplicate enrollment
      const existingEnrollment = await tx.enrollment.findFirst({
        where: {
          studentId: student.id,
          courseId: courseRecord.id,
          batchYear,
        },
      });

      if (existingEnrollment) {
        throw new GraphQLError(
          `Student is already enrolled in ${courseName} for batch year ${batchYear}`,
          {
            extensions: {
              code: 'DUPLICATE_ENROLLMENT',
              enrollmentId: existingEnrollment.id,
            },
          }
        );
      }

      // Create enrollment
      const newEnrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId: courseRecord.id,
          batchYear,
          gpa: typeof gpa === 'number' ? gpa : null,
          grade: grade?.trim() || null,
        },
      });

      // Add achievements if provided
      if (achievementPayloads.length > 0) {
        const studentAchievementData = achievementPayloads.map(({ achievementId, notes, awardedAt }) => {
          const entry: Record<string, any> = {
            studentId: student.id,
            achievementId,
          };

          if (notes) {
            entry.notes = notes;
          }

          if (awardedAt) {
            entry.awardedAt = awardedAt;
          }

          return entry;
        });

        if (studentAchievementData.length > 0) {
          await tx.studentAchievement.createMany({
            data: studentAchievementData,
            skipDuplicates: true,
          });
        }

        const enrollmentAchievementData = achievementPayloads.map(
          ({ title, description: achievementDescription, category, awardedAt }) => ({
            enrollmentId: newEnrollment.id,
            badgeTitle: title,
            description: achievementDescription ?? null,
            badgeType: category ?? null,
            semester: null,
            achievementDate: awardedAt ?? null,
          })
        );

        if (enrollmentAchievementData.length > 0) {
          await tx.achievement.createMany({
            data: enrollmentAchievementData,
          });
        }
      }

      return newEnrollment;
    });

    // Fetch enrollment with relations
    const enrollmentWithRelations = await universityDb.enrollment.findUnique({
      where: { id: enrollmentRecord.id },
      include: {
        course: true,
        student: true,
        achievements: true,
      },
    });

    logger.info(
      {
        enrollmentId: enrollmentRecord.id,
        studentId: student.id,
        courseCode: courseCodeRaw,
        batchYear,
      },
      'Student enrolled in additional course'
    );

    return enrollmentWithRelations ?? enrollmentRecord;
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
          walletAddress: string;
          program: string;
          department: string;
          enrollmentYear: number;
          courseCode: string;
          courseName: string;
          courseDescription?: string | null;
          courseCredits?: number | null;
          courseSemester?: string | null;
          degreeType: string;
          enrollmentSemester?: string | null;
          enrollmentStatus?: string | null;
          enrollmentGpa?: number | null;
          enrollmentGrade?: string | null;
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

    for (const row of input.students) {
      const rowNumber = row.rowNumber ?? 0;
      const fullName = row.fullName?.trim() ?? '';
      const email = row.email?.trim().toLowerCase() ?? '';
      const studentNumber = row.studentNumber?.trim() ?? '';
      const nationalId = row.nationalId?.trim() ?? '';
      const program = row.program?.trim() ?? '';
      const department = row.department?.trim() ?? '';
      const enrollmentYear = row.enrollmentYear;
      const courseCode = row.courseCode?.trim() ?? '';
      const courseName = row.courseName?.trim() ?? '';
      const courseDescription = row.courseDescription?.trim() ?? null;
      const courseCredits = typeof row.courseCredits === 'number' ? row.courseCredits : null;
      const degreeType = row.degreeType?.trim() ?? '';
      const enrollmentGpa = typeof row.enrollmentGpa === 'number' ? row.enrollmentGpa : null;
      const enrollmentGrade = row.enrollmentGrade?.trim() ?? null;
      const walletAddressInput = row.walletAddress?.trim() ?? '';
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

      // Validate NIC format
      const nicValidation = validateNIC(nationalId);
      if (!nicValidation.isValid) {
        addFailure(nicValidation.error || 'Invalid NIC format', 'nationalId');
        continue;
      }

      if (!program) {
        addFailure('Program is required', 'program');
        continue;
      }

      if (!department) {
        addFailure('Department is required', 'department');
        continue;
      }

      if (!courseCode) {
        addFailure('Course code is required', 'courseCode');
        continue;
      }

      if (!courseName) {
        addFailure('Course name is required', 'courseName');
        continue;
      }

      if (!degreeType) {
        addFailure('Degree type is required', 'degreeType');
        continue;
      }

      if (!Number.isInteger(enrollmentYear)) {
        addFailure('Enrollment year must be an integer', 'enrollmentYear');
        continue;
      }

      if (!walletAddressInput) {
        addFailure('Wallet address is required', 'walletAddress');
        continue;
      }

      let normalizedWallet: string;
      try {
        normalizedWallet = new PublicKey(walletAddressInput).toBase58();
      } catch {
        addFailure('Invalid Solana wallet address', 'walletAddress');
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

      try {
        // Check if student already exists by NIC hash (primary identifier)
        const existingStudentByNic = await universityDb.student.findUnique({
          where: { nicHash },
        });

        // If student doesn't exist by NIC, check for conflicts with email/studentNumber from OTHER students
        if (!existingStudentByNic) {
          const conflictingStudent = await universityDb.student.findFirst({
            where: {
              OR: [{ email }, { studentNumber }],
            },
          });

          if (conflictingStudent) {
            throw new GraphQLError('Another student already uses this email or student number', {
              extensions: { code: 'BAD_USER_INPUT', field: 'email' },
            });
          }
        }

        let globalIndex = await sharedDb.globalStudentIndex.findUnique({
          where: { nicHash },
        });

        if (globalIndex) {
          if (globalIndex.walletAddress) {
            if (globalIndex.walletAddress !== normalizedWallet) {
              if (overwriteWithGlobalWallet) {
              logger.warn(
                {
                  nicHash,
                  providedWallet: normalizedWallet,
                  globalWallet: globalIndex.walletAddress,
                  rowNumber,
                },
                  'Wallet mismatch with global index, overwriting with existing global wallet'
                );
                normalizedWallet = globalIndex.walletAddress;
              } else {
                throw new GraphQLError(
                  'Wallet address does not match existing record in the Global Student Index. Enable "Prefer wallet from Global Index" to use the existing wallet.',
                  {
                    extensions: { code: 'BAD_USER_INPUT', field: 'walletAddress' },
                  }
                );
              }
            }
          } else {
            await sharedDb.globalStudentIndex.update({
              where: { nicHash },
              data: { walletAddress: normalizedWallet },
            });
          }
        } else {
          await sharedDb.globalStudentIndex.create({
            data: {
              nicHash,
              walletAddress: normalizedWallet,
              encryptedEmail: encrypt(email),
              createdByUniversityId: context.admin!.universityId!,
            },
          });
        }

        const achievementsInput: StudentAchievementInput[] = achievementTitles.map((title) => ({
          title,
        }));

        await universityDb.$transaction(async (tx: any) => {
          const achievementPayloads = await resolveStudentAchievementInputs(tx, achievementsInput);

          const normalizedCourseCode = normalizeCourseCode(courseCode.length > 0 ? courseCode : courseName);
          const courseCreateData: any = {
            code: normalizedCourseCode,
            name: courseName,
            department,
            level: degreeType,
            isActive: true,
          };
          const courseUpdateData: any = {
            name: courseName,
            department,
            level: degreeType,
            isActive: true,
          };

          if (courseDescription) {
            courseCreateData.description = courseDescription;
            courseUpdateData.description = courseDescription;
          }

          if (courseCredits !== null) {
            courseCreateData.credits = courseCredits;
            courseUpdateData.credits = courseCredits;
          }

          const courseRecord = await tx.course.upsert({
            where: { code: normalizedCourseCode },
            create: courseCreateData,
            update: courseUpdateData,
          });

          let studentRecord: any;

          if (existingStudentByNic) {
            // Student already exists - update their info with latest data
            studentRecord = await tx.student.update({
              where: { id: existingStudentByNic.id },
              data: {
                program,
                department,
                enrollmentYear,
              },
            });

            // Check if already enrolled in this course for this batch year
            const existingEnrollment = await tx.enrollment.findFirst({
              where: {
                studentId: studentRecord.id,
                courseId: courseRecord.id,
                batchYear: enrollmentYear,
              },
            });

            if (existingEnrollment) {
              throw new GraphQLError(
                `Student is already registered with the course "${courseName}" (${enrollmentYear})`,
                {
                  extensions: {
                    code: 'DUPLICATE_ENROLLMENT',
                    enrollmentId: existingEnrollment.id,
                  },
                }
              );
            }
          } else {
            // Create new student
            studentRecord = await tx.student.create({
              data: {
                email,
                fullName,
                studentNumber,
                nicHash,
                walletAddress: normalizedWallet,
                program,
                department,
                enrollmentYear,
              },
            });
          }

          const enrollmentRecord = await tx.enrollment.create({
            data: {
              studentId: studentRecord.id,
              courseId: courseRecord.id,
              batchYear: enrollmentYear,
              gpa: enrollmentGpa,
              grade: enrollmentGrade,
            },
          });

          if (achievementPayloads.length > 0) {
            const studentAchievementData = achievementPayloads.map(({ achievementId, notes, awardedAt }) => {
              const entry: Record<string, any> = {
                studentId: studentRecord.id,
                achievementId,
              };

              if (notes) {
                entry.notes = notes;
              }

              if (awardedAt) {
                entry.awardedAt = awardedAt;
              }

              return entry;
            });

            if (studentAchievementData.length > 0) {
              await tx.studentAchievement.createMany({
                data: studentAchievementData,
                skipDuplicates: true,
              });
            }

            const enrollmentAchievementData = achievementPayloads.map(
              ({ title, description: achievementDescription, category, awardedAt }) => ({
                enrollmentId: enrollmentRecord.id,
                badgeTitle: title,
                description: achievementDescription ?? null,
                badgeType: category ?? null,
                semester: null,
                achievementDate: awardedAt ?? null,
              })
            );

            if (enrollmentAchievementData.length > 0) {
              await tx.achievement.createMany({
                data: enrollmentAchievementData,
              });
            }
          }
        });

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
   * Delete a student (hard delete if no certificates issued)
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
      throw new GraphQLError('Cannot delete student with issued certificates', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Hard delete - cascades to enrollments, achievements, etc.
    await universityDb.student.delete({
      where: { id },
    });

    logger.info({ studentId: id, nicHash: existing.nicHash }, 'Student deleted');

    return true;
  },
};

