import { GraphQLError } from 'graphql';
import { Keypair } from '@solana/web3.js';
import { sharedDb } from '../../../db/shared.client.js';
import { hashPassword } from '../../../auth/password.js';
import { encrypt } from '../../../utils/crypto.js';
import { GraphQLContext, requireSuperAdmin, requireUniversityAdmin } from '../../context.js';
import { logger } from '../../../utils/logger.js';
import { env } from '../../../env.js';
import { provisionUniversityDatabase } from '../../../services/database/provisioning.service.js';

interface RegisterUniversityInput {
  name: string;
  domain: string;
  country: string;
  logoUrl?: string;
  websiteUrl?: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

interface UpdateUniversityInput {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export const universityMutations = {
  /**
   * Register a new university (Super Admin only)
   * This creates the university and its admin account
   */
  async registerUniversity(_: any, { input }: { input: RegisterUniversityInput }, context: GraphQLContext) {
    requireSuperAdmin(context);

    const { name, domain, country, logoUrl, websiteUrl, adminEmail, adminPassword, adminFullName } = input;

    // Check if domain already exists
    const existing = await sharedDb.university.findUnique({
      where: { domain },
    });

    if (existing) {
      throw new GraphQLError(`University with domain ${domain} already exists`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Check if admin email already exists
    const existingAdmin = await sharedDb.admin.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      throw new GraphQLError(`Admin with email ${adminEmail} already exists`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Generate unique username from domain (use full domain with dots replaced)
    const username = domain.replace(/\./g, '_').toLowerCase();

    // Generate Solana wallet for university
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    const privateKey = Buffer.from(keypair.secretKey).toString('base64');
    const privateKeyEncrypted = encrypt(privateKey);

    // Generate database name for this university
    const databaseName = `genuinegrads_${domain.replace(/\./g, '_').toLowerCase()}`;
    const databaseUrl = env.UNIVERSITY_DATABASE_URL.replace(/\/[^/]*$/, `/${databaseName}`);

    // Hash admin password
    const passwordHash = await hashPassword(adminPassword);

    // Create university and admin in a transaction
    const result = await sharedDb.$transaction(async (tx) => {
      // Create university
      const university = await tx.university.create({
        data: {
          name,
          domain,
          country,
          logoUrl,
          websiteUrl,
          walletAddress,
          privateKeyEncrypted,
          databaseUrl,
          databaseName,
          status: 'PENDING_APPROVAL',
        },
      });

      // Create admin for this university
      const admin = await tx.admin.create({
        data: {
          email: adminEmail,
          username, // Use full domain as username (guaranteed unique)
          passwordHash,
          fullName: adminFullName,
          universityId: university.id,
          isSuperAdmin: false,
        },
      });

      return { university, admin };
    });

    logger.info(
      {
        universityId: result.university.id,
        domain,
        adminEmail,
      },
      'University registered'
    );

    return result.university;
  },

  /**
   * Approve a pending university (Super Admin only)
   * This provisions the private database and initializes Merkle tree
   */
  async approveUniversity(_: any, { universityId }: { universityId: string }, context: GraphQLContext) {
    requireSuperAdmin(context);

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

    logger.info(
      { 
        universityId, 
        domain: university.domain, 
        approvedBy: context.admin!.id 
      },
      'Starting university approval process'
    );

    // Step 1: Provision university private database
    logger.info({ domain: university.domain }, 'Provisioning university database');
    
    const provisionResult = await provisionUniversityDatabase(university.domain);

    if (!provisionResult.success) {
      logger.error(
        { 
          universityId, 
          error: provisionResult.error 
        },
        'Failed to provision university database'
      );
      
      throw new GraphQLError(
        `Failed to provision database: ${provisionResult.error}`,
        {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        }
      );
    }

    logger.info(
      { 
        universityId, 
        databaseName: provisionResult.databaseName 
      },
      'Database provisioned successfully'
    );

    // Step 2: TODO - Initialize Bubblegum Merkle tree on Solana
    // This would call the Solana program to create a new tree
    // For now, we'll set a placeholder
    let merkleTreeAddress: string | undefined = undefined;
    
    try {
      // Placeholder for Merkle tree creation
      // In production, this would:
      // 1. Create a new Bubblegum tree
      // 2. Set university as tree authority
      // 3. Configure tree parameters (max depth, max buffer size, canopy depth)
      // merkleTreeAddress = await createBubblegumTree(university.walletAddress);
      
      logger.info({ universityId }, 'Merkle tree creation skipped (placeholder)');
    } catch (error) {
      logger.warn(
        { error, universityId },
        'Merkle tree creation failed, but continuing approval'
      );
    }

    // Step 3: Update university status to APPROVED
    const updated = await sharedDb.university.update({
      where: { id: universityId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: context.admin!.id,
        databaseUrl: provisionResult.databaseUrl,
        databaseName: provisionResult.databaseName,
        ...(merkleTreeAddress && { merkleTreeAddress }),
      },
    });

    logger.info(
      { 
        universityId, 
        domain: university.domain,
        databaseName: provisionResult.databaseName,
        approvedBy: context.admin!.id 
      },
      '✅ University approved successfully'
    );

    return updated;
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

    return updated;
  },

  /**
   * Suspend a university (Super Admin only)
   */
  async suspendUniversity(
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

    const updated = await sharedDb.university.update({
      where: { id: universityId },
      data: {
        status: 'SUSPENDED',
        rejectedReason: reason,
      },
    });

    logger.info({ universityId, reason }, 'University suspended');

    return updated;
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

