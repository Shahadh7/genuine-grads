import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../../context.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { sharedDb } from '../../../db/shared.client.js';
import { logger } from '../../../utils/logger.js';
import {
  verifyAchievementProof,
  Groth16Proof
} from '../../../services/zkp/zk-verifier.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get university database for a credential (mintAddress)
 * This is needed for public queries where we don't have university context
 */
async function getUniversityDbForCredential(credentialId: string) {
  // Find the mint log to determine which university issued this certificate
  const mintLog = await sharedDb.mintActivityLog.findUnique({
    where: { mintAddress: credentialId },
    include: {
      university: true
    }
  });

  if (!mintLog) {
    throw new GraphQLError('Certificate not found', {
      extensions: { code: 'NOT_FOUND' }
    });
  }

  if (!mintLog.university.databaseUrl) {
    throw new GraphQLError('University database not configured', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' }
    });
  }

  return getUniversityDb(mintLog.university.databaseUrl);
}

// =============================================================================
// Queries
// =============================================================================

export const zkQueries = {
  /**
   * Get ZK status for a certificate (student dashboard)
   * Requires student authentication
   */
  async myZkCertificateStatus(
    _: any,
    { credentialId }: { credentialId: string },
    context: GraphQLContext
  ) {
    if (!context.student?.id) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    // Get the university database for this credential
    const universityDb = await getUniversityDbForCredential(credentialId);

    // Verify the certificate exists and belongs to the student
    const certificate = await universityDb.certificate.findUnique({
      where: { mintAddress: credentialId },
      select: {
        id: true,
        studentId: true
      }
    });

    if (!certificate) {
      throw new GraphQLError('Certificate not found', {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    // Find student in this university's database by wallet address
    const studentInUniversity = await universityDb.student.findUnique({
      where: { walletAddress: context.student.walletAddress }
    });

    if (!studentInUniversity || certificate.studentId !== studentInUniversity.id) {
      throw new GraphQLError('You do not own this certificate', {
        extensions: { code: 'FORBIDDEN' }
      });
    }

    // Get ZK commitments and proofs for this credential
    // These are the source of truth for what achievements have ZK enabled
    const commitments = await universityDb.zkAchievementCommitment.findMany({
      where: { credentialId }
    });

    const proofs = await universityDb.zkAchievementProof.findMany({
      where: { credentialId }
    });

    // Build a unique list of achievement codes from commitments and proofs
    const achievementCodesSet = new Set<string>();
    commitments.forEach((c: any) => achievementCodesSet.add(c.achievementCode));
    proofs.forEach((p: any) => achievementCodesSet.add(p.achievementCode));

    // Build status for each achievement that has ZK data
    const achievementStatuses = Array.from(achievementCodesSet).map((achievementCode) => {
      const commitment = commitments.find((c: any) => c.achievementCode === achievementCode);
      const proof = proofs.find((p: any) => p.achievementCode === achievementCode);

      return {
        achievementCode,
        achievementTitle: achievementCode,
        zkEnabled: !!commitment,
        hasCommitment: !!commitment,
        hasProof: !!proof,
        lastVerifiedAt: proof?.lastVerifiedAt || null,
        verificationCount: proof?.verificationCount || 0
      };
    });

    return {
      credentialId,
      achievements: achievementStatuses
    };
  },

  /**
   * PUBLIC: Get ZK status for achievements on a certificate
   * No authentication required - used by employers
   */
  async getZkAchievementStatuses(
    _: any,
    { credentialId }: { credentialId: string },
    _context: GraphQLContext
  ) {
    logger.info({ credentialId }, 'Fetching ZK achievement statuses (public)');

    // Get the appropriate university database
    const universityDb = await getUniversityDbForCredential(credentialId);

    // Get ZK commitments and proofs for this credential
    const commitments = await universityDb.zkAchievementCommitment.findMany({
      where: { credentialId }
    });

    const proofs = await universityDb.zkAchievementProof.findMany({
      where: { credentialId }
    });

    // Build a unique list of achievement codes from commitments and proofs
    const achievementCodesSet = new Set<string>();
    commitments.forEach((c: any) => achievementCodesSet.add(c.achievementCode));
    proofs.forEach((p: any) => achievementCodesSet.add(p.achievementCode));

    // Build status for each achievement that has ZK data
    return Array.from(achievementCodesSet).map((achievementCode) => {
      const commitment = commitments.find((c: any) => c.achievementCode === achievementCode);
      const proof = proofs.find((p: any) => p.achievementCode === achievementCode);

      return {
        achievementCode,
        achievementTitle: achievementCode,
        zkEnabled: !!commitment,
        hasCommitment: !!commitment,
        hasProof: !!proof,
        lastVerifiedAt: proof?.lastVerifiedAt || null,
        verificationCount: proof?.verificationCount || 0
      };
    });
  },

  /**
   * PUBLIC: Verify a stored proof (employer verification)
   * No authentication required
   */
  async verifyStoredAchievementProof(
    _: any,
    { input }: { input: { credentialId: string; achievementCode: string } },
    context: GraphQLContext
  ) {
    const { credentialId, achievementCode } = input;

    logger.info({ credentialId, achievementCode }, 'Verifying stored ZK proof (public)');

    // Get the appropriate university database
    const universityDb = await getUniversityDbForCredential(credentialId);

    // Fetch stored commitment
    const commitment = await universityDb.zkAchievementCommitment.findUnique({
      where: {
        credentialId_achievementCode: {
          credentialId,
          achievementCode
        }
      }
    });

    if (!commitment) {
      // Create audit log for failed verification
      await universityDb.zkProofAuditLog.create({
        data: {
          credentialId,
          achievementCode,
          success: false,
          failureReason: 'ZK verification not enabled for this achievement',
          proofHash: 'N/A',
          requesterIp: context.req?.ip || null,
          requesterAgent: context.req?.headers['user-agent'] || null
        }
      });

      return {
        verified: false,
        verifiedAt: null,
        failureReason: 'ZK verification not enabled for this achievement',
        proofHash: null
      };
    }

    // Fetch stored proof
    const proof = await universityDb.zkAchievementProof.findUnique({
      where: {
        credentialId_achievementCode: {
          credentialId,
          achievementCode
        }
      }
    });

    if (!proof) {
      // Create audit log for failed verification
      await universityDb.zkProofAuditLog.create({
        data: {
          credentialId,
          achievementCode,
          success: false,
          failureReason: 'Proof not yet generated by student',
          proofHash: 'N/A',
          requesterIp: context.req?.ip || null,
          requesterAgent: context.req?.headers['user-agent'] || null
        }
      });

      return {
        verified: false,
        verifiedAt: null,
        failureReason: 'Proof not yet generated by student',
        proofHash: null
      };
    }

    // Verify the proof
    const proofJson = proof.proofJson as unknown as Groth16Proof;
    const publicSignals = proof.publicSignals as unknown as string[];

    const result = await verifyAchievementProof(
      proofJson,
      publicSignals,
      commitment.commitment,
      credentialId,
      achievementCode
    );

    const now = new Date();

    // Create audit log
    await universityDb.zkProofAuditLog.create({
      data: {
        credentialId,
        achievementCode,
        proofId: proof.id,
        success: result.verified,
        failureReason: result.failureReason || null,
        proofHash: result.proofHash,
        requesterIp: context.req?.ip || null,
        requesterAgent: context.req?.headers['user-agent'] || null
      }
    });

    // Update proof verification status
    if (result.verified) {
      await universityDb.zkAchievementProof.update({
        where: { id: proof.id },
        data: {
          verified: true,
          verifiedAt: proof.verifiedAt || now,
          lastVerifiedAt: now,
          verificationCount: proof.verificationCount + 1
        }
      });
    }

    logger.info({
      credentialId,
      achievementCode,
      verified: result.verified,
      proofHash: result.proofHash
    }, 'ZK proof verification completed');

    return {
      verified: result.verified,
      verifiedAt: result.verified ? now : null,
      failureReason: result.failureReason || null,
      proofHash: result.proofHash
    };
  }
};
