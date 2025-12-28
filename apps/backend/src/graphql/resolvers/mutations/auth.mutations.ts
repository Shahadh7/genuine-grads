import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../../auth/password.js';
import { generateTokenPair, verifyRefreshToken } from '../../../auth/jwt.js';
import { verifyTOTPToken, decryptTOTPSecret } from '../../../auth/totp.js';
import { GraphQLContext } from '../../context.js';
import { logger } from '../../../utils/logger.js';

interface RegisterInput {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  universityId?: string;
}

interface LoginInput {
  email: string;
  password: string;
  totpToken?: string;
}

export const authMutations = {
  /**
   * Register a new admin (can be super admin or university admin)
   */
  async register(_: any, { input }: { input: RegisterInput }, _context: GraphQLContext) {
    const { email, password, username, fullName, universityId } = input;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new GraphQLError(passwordValidation.errors.join(', '), {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Check if email or username already exists
    const existing = await sharedDb.admin.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      throw new GraphQLError('Email or username already exists', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // If universityId provided, verify university exists and is approved
    if (universityId) {
      const university = await sharedDb.university.findUnique({
        where: { id: universityId },
      });

      if (!university) {
        throw new GraphQLError('University not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (university.status !== 'APPROVED') {
        throw new GraphQLError('University is not approved yet', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin
    const admin = await sharedDb.admin.create({
      data: {
        email,
        username,
        passwordHash,
        fullName,
        universityId,
        isSuperAdmin: false, // Super admins are created via seed only
      },
      include: {
        university: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      sub: admin.id,
      type: admin.isSuperAdmin ? 'super_admin' : 'admin',
      email: admin.email,
      universityId: admin.universityId || undefined,
    });

    logger.info({ adminId: admin.id, email: admin.email }, 'Admin registered');

    return {
      admin,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      requiresTOTP: false,
    };
  },

  /**
   * Login with email and password (and optional TOTP token)
   */
  async login(_: any, { input }: { input: LoginInput }, _context: GraphQLContext) {
    const { email, password, totpToken } = input;

    // Find admin by email
    const admin = await sharedDb.admin.findUnique({
      where: { email },
      include: {
        university: true,
      },
    });

    if (!admin) {
      throw new GraphQLError('Invalid email or password', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new GraphQLError('Account is temporarily locked. Please try again later.', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new GraphQLError('Account is inactive. Please contact support.', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Verify password
    const isValid = await verifyPassword(admin.passwordHash, password);

    if (!isValid) {
      // Increment failed login attempts
      const failedAttempts = admin.failedLoginAttempts + 1;
      const updates: any = { failedLoginAttempts: failedAttempts };

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        logger.warn({ email }, 'Account locked due to too many failed login attempts');
      }

      await sharedDb.admin.update({
        where: { id: admin.id },
        data: updates,
      });

      throw new GraphQLError('Invalid email or password', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Check if TOTP is enabled and verify token
    if (admin.totpEnabled && admin.totpSecret) {
      // If TOTP is enabled but no token provided, request it
      if (!totpToken) {
        return {
          admin: null,
          accessToken: null,
          refreshToken: null,
          requiresTOTP: true,
        };
      }

      // Verify the TOTP token
      const decryptedSecret = decryptTOTPSecret(admin.totpSecret);
      const isTOTPValid = verifyTOTPToken(decryptedSecret, totpToken);

      if (!isTOTPValid) {
        throw new GraphQLError('Invalid verification code', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
    }

    // Check university approval status (only for university admins, not super admins)
    if (admin.university && !admin.isSuperAdmin) {
      const { status, rejectedReason } = admin.university;

      switch (status) {
        case 'PENDING_APPROVAL':
          throw new GraphQLError('Your university is pending approval. Please wait for administrator verification.', {
            extensions: { code: 'FORBIDDEN' },
          });
        case 'REJECTED':
          throw new GraphQLError(
            rejectedReason
              ? `Your university registration was rejected. Reason: ${rejectedReason}`
              : 'Your university registration was rejected. Please contact support.',
            {
              extensions: { code: 'FORBIDDEN' },
            }
          );
        case 'SUSPENDED':
          throw new GraphQLError('Your university account has been suspended. Please contact support.', {
            extensions: { code: 'FORBIDDEN' },
          });
        case 'APPROVED':
          // Allow login
          break;
        default:
          throw new GraphQLError('Invalid university status. Please contact support.', {
            extensions: { code: 'FORBIDDEN' },
          });
      }
    }

    // Reset failed login attempts and update last login
    await sharedDb.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      sub: admin.id,
      type: admin.isSuperAdmin ? 'super_admin' : 'admin',
      email: admin.email,
      universityId: admin.universityId || undefined,
    });

    logger.info({ adminId: admin.id, email: admin.email }, 'Admin logged in');

    return {
      admin,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      requiresTOTP: false,
    };
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(_: any, { refreshToken }: { refreshToken: string }, _context: GraphQLContext) {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Fetch admin to ensure still active
      const admin = await sharedDb.admin.findUnique({
        where: { id: payload.sub },
        include: {
          university: true,
        },
      });

      if (!admin || !admin.isActive) {
        throw new GraphQLError('Invalid or expired refresh token', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Check university approval status (only for university admins, not super admins)
      if (admin.university && !admin.isSuperAdmin) {
        const { status, rejectedReason } = admin.university;

        switch (status) {
          case 'PENDING_APPROVAL':
            throw new GraphQLError('Your university is pending approval. Please wait for administrator verification.', {
              extensions: { code: 'FORBIDDEN' },
            });
          case 'REJECTED':
            throw new GraphQLError(
              rejectedReason
                ? `Your university registration was rejected. Reason: ${rejectedReason}`
                : 'Your university registration was rejected. Please contact support.',
              {
                extensions: { code: 'FORBIDDEN' },
              }
            );
          case 'SUSPENDED':
            throw new GraphQLError('Your university account has been suspended. Please contact support.', {
              extensions: { code: 'FORBIDDEN' },
            });
          case 'APPROVED':
            // Allow token refresh
            break;
          default:
            throw new GraphQLError('Invalid university status. Please contact support.', {
              extensions: { code: 'FORBIDDEN' },
            });
        }
      }

      // Generate new tokens
      const tokens = generateTokenPair({
        sub: admin.id,
        type: admin.isSuperAdmin ? 'super_admin' : 'admin',
        email: admin.email,
        universityId: admin.universityId || undefined,
      });

      return {
        admin,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        requiresTOTP: false,
      };
    } catch (error) {
      throw new GraphQLError('Invalid or expired refresh token', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
  },

  /**
   * Logout (client should delete tokens)
   */
  async logout(_: any, __: any, context: GraphQLContext) {
    // In a stateless JWT system, logout is primarily client-side
    // Optionally, you could implement a token blacklist here
    logger.info({ adminId: context.admin?.id }, 'Admin logged out');
    return true;
  },
};

