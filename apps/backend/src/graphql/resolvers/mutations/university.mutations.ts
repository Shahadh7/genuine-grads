import { GraphQLError } from 'graphql';
import { PublicKey } from '@solana/web3.js';
import { sharedDb } from '../../../db/shared.client.js';
import { hashPassword } from '../../../auth/password.js';
import { GraphQLContext, requireSuperAdmin, requireUniversityAdmin } from '../../context.js';
import { logger } from '../../../utils/logger.js';
import { env } from '../../../env.js';
import { provisionUniversityDatabase } from '../../../services/database/provisioning.service.js';
import { solanaService } from '../../../services/solana/solana.service.js';
import { notificationService } from '../../../services/notification/notification.service.js';

interface RegisterUniversityInput {
  name: string;
  domain: string;
  country: string;
  logoUrl?: string;
  websiteUrl?: string;
  walletAddress: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  registrationSignature: string;
  universityPda: string;
}

interface ApproveUniversityInput {
  universityId: string;
  approvalSignature: string;
  universityPda: string;
}

interface DeactivateUniversityInput {
  universityId: string;
  deactivationSignature: string;
  universityPda: string;
  reason?: string;
}

interface SuspendUniversityInput extends DeactivateUniversityInput {
  reason: string;
}

interface UpdateUniversityInput {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
}

async function performUniversityDeactivation({
  universityId,
  deactivationSignature,
  universityPda,
  reason,
  adminId,
}: DeactivateUniversityInput & { adminId: string }) {
  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  const authority = new PublicKey(university.walletAddress);
  const [expectedUniversityPda] = solanaService.deriveUniversityPDA(authority);

  if (expectedUniversityPda.toBase58() !== universityPda) {
    throw new GraphQLError('Provided university PDA does not match the derived PDA for this wallet', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  await solanaService.confirmSignature(deactivationSignature);

  const onChainExists = await solanaService.universityExists(authority);
  if (!onChainExists) {
    throw new GraphQLError('University account not found on-chain after deactivation transaction', {
      extensions: { code: 'BLOCKCHAIN_ERROR' },
    });
  }

  const updateData: Record<string, any> = {
    status: 'SUSPENDED',
    deactivationTxSignature: deactivationSignature,
  };

  if (typeof reason === 'string') {
    updateData.rejectedReason = reason;
  }

  const updated = await sharedDb.university.update({
    where: { id: universityId },
    data: updateData as any,
  });

  logger.info(
    {
      universityId,
      signature: deactivationSignature,
      reason,
      adminId,
    },
    'University deactivated on-chain and indexed'
  );

  // Notify university admins about suspension
  try {
    await notificationService.notifyUniversityAdmins(universityId, 'UNIVERSITY_SUSPENDED', {
      universityName: university.name,
      universityId,
      reason: reason || 'Policy violation',
    });
  } catch (notifError) {
    logger.warn({ error: notifError, universityId }, 'Failed to send suspension notification');
  }

  return updated;
}

export const universityMutations = {
  /**
   * Register a new university (Public - no auth required)
   * This creates the university and its admin account with PENDING_APPROVAL status
   * Super Admin will approve/reject later
   */
  async registerUniversity(_: any, { input }: { input: RegisterUniversityInput }) {
    const {
      name,
      domain,
      country,
      logoUrl,
      websiteUrl,
      walletAddress,
      adminEmail,
      adminPassword,
      adminFullName,
      registrationSignature,
      universityPda,
    } = input;

    if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
      throw new GraphQLError('Invalid Solana wallet address format', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (!registrationSignature) {
      throw new GraphQLError('registrationSignature is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (!universityPda) {
      throw new GraphQLError('universityPda is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const universityAuthority = new PublicKey(walletAddress);
    const [expectedUniversityPda] = solanaService.deriveUniversityPDA(universityAuthority);

    if (expectedUniversityPda.toBase58() !== universityPda) {
      throw new GraphQLError('Provided university PDA does not match expected PDA for this wallet', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const existing = await sharedDb.university.findUnique({ where: { domain } });
    if (existing) {
      throw new GraphQLError(`University with domain ${domain} already exists`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const existingWallet = await sharedDb.university.findUnique({ where: { walletAddress } });
    if (existingWallet) {
      throw new GraphQLError(`This wallet address is already registered with another university`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const existingPda = await sharedDb.university.findUnique({ where: { universityPDA: universityPda } });
    if (existingPda) {
      throw new GraphQLError('This university PDA is already registered', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const existingAdmin = await sharedDb.admin.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
      throw new GraphQLError(`Admin with email ${adminEmail} already exists`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    await solanaService.confirmSignature(registrationSignature);

    const onChainExists = await solanaService.universityExists(universityAuthority);
    if (!onChainExists) {
      throw new GraphQLError('University account was not found on-chain. Please retry the transaction.', {
        extensions: { code: 'BLOCKCHAIN_ERROR' },
      });
    }

    const username = domain.replace(/\./g, '_').toLowerCase();
    const databaseName = `genuinegrads_${domain.replace(/\./g, '_').toLowerCase()}`;
    const databaseUrl = env.UNIVERSITY_DATABASE_URL.replace(/\/[^/]*$/, `/${databaseName}`);
    const passwordHash = await hashPassword(adminPassword);

    const result = await sharedDb.$transaction(async (tx: any) => {
      const university = await tx.university.create({
        data: {
          name,
          domain,
          country,
          logoUrl,
          websiteUrl,
          walletAddress,
          universityPDA: universityPda,
          registrationTxSignature: registrationSignature,
          superAdminPubkey: env.SOLANA_SUPER_ADMIN_PUBKEY,
          databaseUrl,
          databaseName,
          status: 'PENDING_APPROVAL',
        } as any,
      });

      await tx.admin.create({
        data: {
          email: adminEmail,
          username,
          passwordHash,
          fullName: adminFullName,
          universityId: university.id,
          isSuperAdmin: false,
        },
      });

      return university;
    });

    logger.info(
      {
        universityId: result.id,
        domain,
        walletAddress,
        signature: registrationSignature,
      },
      'University registration indexed after on-chain success'
    );

    // Notify super admins about new university registration
    try {
      await notificationService.notifySuperAdmins('UNIVERSITY_REGISTERED', {
        universityName: name,
        universityId: result.id,
        domain,
        country,
      });
    } catch (notifError) {
      logger.warn({ error: notifError, universityId: result.id }, 'Failed to send registration notification');
    }

    return result;
  },

  async approveUniversity(_: any, { input }: { input: ApproveUniversityInput }, context: GraphQLContext) {
    requireSuperAdmin(context);

    const { universityId, approvalSignature, universityPda } = input;

    const university = await sharedDb.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (university.status === 'APPROVED') {
      throw new GraphQLError('University is already approved', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const authority = new PublicKey(university.walletAddress);
    const [expectedUniversityPda] = solanaService.deriveUniversityPDA(authority);

    if (expectedUniversityPda.toBase58() !== universityPda) {
      throw new GraphQLError('Provided university PDA does not match the derived PDA for this wallet', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    await solanaService.confirmSignature(approvalSignature);

    const onChainExists = await solanaService.universityExists(authority);
    if (!onChainExists) {
      throw new GraphQLError('University account not found on-chain after approval transaction', {
        extensions: { code: 'BLOCKCHAIN_ERROR' },
      });
    }

    logger.info(
      {
        universityId,
        domain: university.domain,
        approvedBy: context.admin!.id,
      },
      'Provisioning university database after on-chain approval'
    );

    const provisionResult = await provisionUniversityDatabase(university.domain);

    if (!provisionResult.success) {
      logger.error(
        {
          universityId,
          error: provisionResult.error,
        },
        'Failed to provision university database'
      );

      throw new GraphQLError(`Failed to provision database: ${provisionResult.error}`, {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    const updated = await sharedDb.university.update({
      where: { id: universityId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: context.admin!.id,
        approvalTxSignature: approvalSignature,
        universityPDA: universityPda,
        databaseUrl: provisionResult.databaseUrl,
        databaseName: provisionResult.databaseName,
        deactivationTxSignature: null,
        rejectedReason: null,
      } as any,
    });

    logger.info(
      {
        universityId,
        domain: university.domain,
        databaseName: provisionResult.databaseName,
        approvedBy: context.admin!.id,
      },
      '✅ University approval indexed after on-chain confirmation'
    );

    // Notify university admins about approval
    try {
      await notificationService.notifyUniversityAdmins(universityId, 'UNIVERSITY_APPROVED', {
        universityName: university.name,
        universityId,
      });
    } catch (notifError) {
      logger.warn({ error: notifError, universityId }, 'Failed to send approval notification');
    }

    return updated;
  },

  async deactivateUniversity(_: any, { input }: { input: DeactivateUniversityInput }, context: GraphQLContext) {
    requireSuperAdmin(context);
    return performUniversityDeactivation({
      ...input,
      adminId: context.admin!.id,
    });
  },

  /**
   * Reject a pending university (Super Admin only)
   */
  async rejectUniversity(
    _: any,
    { universityId, reason }: { universityId: string; reason: string },
    context: GraphQLContext
  ) {
    requireSuperAdmin(context);

    const university = await sharedDb.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (university.status !== 'PENDING_APPROVAL') {
      throw new GraphQLError('Can only reject pending universities', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const updated = await sharedDb.university.update({
      where: { id: universityId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });

    logger.info({ universityId, reason }, 'University rejected');

    // Notify university admins about rejection
    try {
      await notificationService.notifyUniversityAdmins(universityId, 'UNIVERSITY_REJECTED', {
        universityName: university.name,
        universityId,
        reason,
      });
    } catch (notifError) {
      logger.warn({ error: notifError, universityId }, 'Failed to send rejection notification');
    }

    return updated;
  },

  /**
   * Suspend a university (Super Admin only)
   */
  async suspendUniversity(_: any, { input }: { input: SuspendUniversityInput }, context: GraphQLContext) {
    requireSuperAdmin(context);

    if (!input.reason || input.reason.trim().length === 0) {
      throw new GraphQLError('Suspension reason is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    return performUniversityDeactivation({
      ...input,
      adminId: context.admin!.id,
    });
  },

  /**
   * Update university profile (University Admin only)
   */
  async updateUniversityProfile(_: any, { input }: { input: UpdateUniversityInput }, context: GraphQLContext) {
    requireUniversityAdmin(context);

    const { name, logoUrl, websiteUrl } = input;

    const updated = await sharedDb.university.update({
      where: { id: context.admin!.universityId },
      data: {
        ...(name && { name }),
        ...(logoUrl && { logoUrl }),
        ...(websiteUrl && { websiteUrl }),
      },
    });

    logger.info({ universityId: updated.id }, 'University profile updated');

    return updated;
  },
};

