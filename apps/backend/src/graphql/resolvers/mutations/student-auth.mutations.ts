import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { generateTokenPair } from '../../../auth/jwt.js';
import { GraphQLContext } from '../../context.js';
import { logger } from '../../../utils/logger.js';

export const studentAuthMutations = {
  /**
   * Student login with wallet address
   */
  async studentLoginWithWallet(
    _: any,
    { walletAddress }: { walletAddress: string },
    _context: GraphQLContext
  ) {
    try {
      // Normalize wallet address
      const normalizedWallet = walletAddress.trim();

      // Check if student exists in GlobalStudentIndex
      const globalStudent = await sharedDb.globalStudentIndex.findUnique({
        where: { walletAddress: normalizedWallet },
        include: {
          createdByUniversity: {
            select: {
              id: true,
              name: true,
              databaseUrl: true,
              status: true,
            },
          },
        },
      });

      if (!globalStudent) {
        throw new GraphQLError('Wallet address not found. Please contact your university to register.', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check if university is still active
      if (globalStudent.createdByUniversity.status !== 'APPROVED') {
        throw new GraphQLError('University is not active. Please contact your university.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Get university database
      const universityDb = getUniversityDb(globalStudent.createdByUniversity.databaseUrl!);

      // Find student in university database
      const student = await universityDb.student.findUnique({
        where: { walletAddress: normalizedWallet },
        select: {
          id: true,
          email: true,
          fullName: true,
          walletAddress: true,
          studentNumber: true,
          program: true,
          department: true,
          enrollmentYear: true,
          graduationYear: true,
          profilePicUrl: true,
          isActive: true,
        },
      });

      if (!student) {
        throw new GraphQLError('Student record not found in university database.', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (!student.isActive) {
        throw new GraphQLError('Student account is inactive. Please contact your university.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Generate JWT tokens
      // For students, we store walletAddress in the email field for context lookup
      // Note: Students are not tied to a single university, they can have certificates from multiple universities
      const tokens = generateTokenPair({
        sub: normalizedWallet, // Use wallet address as subject (students are identified by wallet)
        type: 'student',
        universityId: undefined, // Students are not tied to a single university
        email: normalizedWallet, // Store wallet address for easy lookup
      });

      logger.info({ studentId: student.id, wallet: normalizedWallet }, 'Student logged in with wallet');

      // Return student data from the creating university (for initial session)
      // The meStudent query will aggregate data from all universities
      return {
        student: {
          ...student,
          certificates: [], // Will be populated by myCertificates query
          enrollments: [], // Will be populated by meStudent query
          achievements: [], // Will be populated by myAchievements query
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error({ error, walletAddress }, 'Student wallet login failed');
      throw new GraphQLError('Login failed. Please try again.', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  },
};
