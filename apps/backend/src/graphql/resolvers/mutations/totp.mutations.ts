import { GraphQLError } from 'graphql';
import { sharedDb } from '../../../db/shared.client.js';
import { verifyPassword } from '../../../auth/password.js';
import {
  generateTOTPSetupData,
  verifyTOTPToken,
  encryptTOTPSecret,
} from '../../../auth/totp.js';
import { GraphQLContext } from '../../context.js';
import { logger } from '../../../utils/logger.js';

// In-memory store for pending TOTP secrets (in production, use Redis with TTL)
const pendingTOTPSecrets = new Map<string, { secret: string; expiresAt: Date }>();

// Clean up expired secrets periodically
setInterval(() => {
  const now = new Date();
  for (const [adminId, data] of pendingTOTPSecrets.entries()) {
    if (data.expiresAt < now) {
      pendingTOTPSecrets.delete(adminId);
    }
  }
}, 60000); // Clean up every minute

export const totpMutations = {
  /**
   * Initiate TOTP setup - generates a new secret and QR code
   * The secret is stored temporarily until verified
   */
  async initiateTOTPSetup(_: any, __: any, context: GraphQLContext) {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const admin = await sharedDb.admin.findUnique({
      where: { id: context.admin.id },
    });

    if (!admin) {
      throw new GraphQLError('Admin not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (admin.totpEnabled) {
      throw new GraphQLError('Two-factor authentication is already enabled', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Generate TOTP setup data
    const { secret, qrCodeDataUrl } = await generateTOTPSetupData(admin.email);

    // Store the secret temporarily (expires in 10 minutes)
    pendingTOTPSecrets.set(admin.id, {
      secret,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    logger.info({ adminId: admin.id }, 'TOTP setup initiated');

    return {
      secret,
      qrCodeDataUrl,
    };
  },

  /**
   * Verify a TOTP token and enable 2FA for the admin
   */
  async verifyAndEnableTOTP(_: any, { token }: { token: string }, context: GraphQLContext) {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const admin = await sharedDb.admin.findUnique({
      where: { id: context.admin.id },
    });

    if (!admin) {
      throw new GraphQLError('Admin not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (admin.totpEnabled) {
      throw new GraphQLError('Two-factor authentication is already enabled', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Get the pending secret
    const pendingData = pendingTOTPSecrets.get(admin.id);

    if (!pendingData) {
      throw new GraphQLError('No pending TOTP setup found. Please initiate setup first.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (pendingData.expiresAt < new Date()) {
      pendingTOTPSecrets.delete(admin.id);
      throw new GraphQLError('TOTP setup has expired. Please initiate setup again.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Verify the token
    const isValid = verifyTOTPToken(pendingData.secret, token);

    if (!isValid) {
      throw new GraphQLError('Invalid verification code. Please try again.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Encrypt and save the secret
    const encryptedSecret = encryptTOTPSecret(pendingData.secret);

    await sharedDb.admin.update({
      where: { id: admin.id },
      data: {
        totpSecret: encryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
      },
    });

    // Clean up pending secret
    pendingTOTPSecrets.delete(admin.id);

    logger.info({ adminId: admin.id }, 'TOTP enabled successfully');

    return true;
  },

  /**
   * Disable TOTP 2FA for the admin (requires password confirmation)
   */
  async disableTOTP(_: any, { password }: { password: string }, context: GraphQLContext) {
    if (!context.admin) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const admin = await sharedDb.admin.findUnique({
      where: { id: context.admin.id },
    });

    if (!admin) {
      throw new GraphQLError('Admin not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (!admin.totpEnabled) {
      throw new GraphQLError('Two-factor authentication is not enabled', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(admin.passwordHash, password);

    if (!isPasswordValid) {
      throw new GraphQLError('Invalid password', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Disable TOTP
    await sharedDb.admin.update({
      where: { id: admin.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpVerifiedAt: null,
      },
    });

    logger.info({ adminId: admin.id }, 'TOTP disabled');

    return true;
  },
};
