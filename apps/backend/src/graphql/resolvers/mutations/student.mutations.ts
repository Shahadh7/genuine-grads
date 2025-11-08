import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { hashNIC, encrypt } from '../../../utils/crypto.js';
import { GraphQLContext, requireUniversityAdmin, requireUniversityDb } from '../../context.js';
import { logger } from '../../../utils/logger.js';

interface RegisterStudentInput {
  email: string;
  fullName: string;
  studentNumber: string;
  nationalId: string;
  walletAddress?: string;
  program?: string;
  department?: string;
  enrollmentYear?: number;
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

    const { email, fullName, studentNumber, nationalId, walletAddress, program, department, enrollmentYear } = input;

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
   * Bulk import students from CSV
   * Returns a job ID for tracking progress
   */
  async bulkImportStudents(_: any, { file }: { file: string }, context: GraphQLContext) {
    requireUniversityAdmin(context);

    // TODO: Implement CSV parsing and bulk import
    // This should:
    // 1. Parse CSV file
    // 2. Validate all rows
    // 3. Create a background job with BullMQ
    // 4. Process students one by one
    // 5. Return job ID for tracking

    throw new Error('Bulk import not yet implemented');

    // Placeholder response
    // return {
    //   jobId: 'job_123',
    //   totalRecords: 100,
    //   message: 'Import job started',
    // };
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

