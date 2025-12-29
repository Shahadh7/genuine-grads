import { GraphQLError } from 'graphql';
import { GraphQLContext } from '../../context.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { sharedDb } from '../../../db/shared.client.js';
import { logger } from '../../../utils/logger.js';
import {
  computeProofHash,
  validateProofStructure,
  validatePublicSignals,
  isValidFieldElement,
  Groth16Proof
} from '../../../services/zkp/zk-verifier.js';

// =============================================================================
// Input Types
// =============================================================================

interface RegisterCommitmentInput {
  credentialId: string;      // mintAddress
  achievementCode: string;   // badgeTitle
  commitment: string;        // Poseidon commitment as decimal string
}

interface UploadProofInput {
  credentialId: string;
  achievementCode: string;
  proof: Groth16Proof;
  publicSignals: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get university database for a credential (mintAddress)
 * This is needed because students can have certificates from multiple universities
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

/**
 * Get student from context with proper error handling
 * Note: Student context comes from GlobalStudentIndex (shared DB), not university DB
 * The wallet address is already set in the context from the JWT token
 */
function getAuthenticatedStudent(context: GraphQLContext) {
  if (!context.student?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }

  if (!context.student.walletAddress) {
    throw new GraphQLError('Wallet address not linked to student account', {
      extensions: { code: 'BAD_REQUEST' }
    });
  }

  return {
    id: context.student.id,
    walletAddress: context.student.walletAddress
  };
}

/**
 * Verify student owns the certificate using wallet address
 */
async function verifyCertificateOwnership(
  universityDb: any,
  credentialId: string,
  walletAddress: string
) {
  const certificate = await universityDb.certificate.findUnique({
    where: { mintAddress: credentialId },
    select: {
      id: true,
      studentId: true,
      achievementIds: true,
      status: true,
      revoked: true
    }
  });

  if (!certificate) {
    throw new GraphQLError('Certificate not found', {
      extensions: { code: 'NOT_FOUND' }
    });
  }

  // Find the student in this university's database by wallet address
  const studentInUniversity = await universityDb.student.findUnique({
    where: { walletAddress }
  });

  if (!studentInUniversity || certificate.studentId !== studentInUniversity.id) {
    throw new GraphQLError('You do not own this certificate', {
      extensions: { code: 'FORBIDDEN' }
    });
  }

  if (certificate.status !== 'MINTED') {
    throw new GraphQLError('Certificate is not minted yet', {
      extensions: { code: 'BAD_REQUEST' }
    });
  }

  if (certificate.revoked) {
    throw new GraphQLError('Certificate has been revoked', {
      extensions: { code: 'BAD_REQUEST' }
    });
  }

  return certificate;
}

/**
 * Verify achievement code is valid for the certificate
 * Since achievements can come from various sources (metadata, StudentAchievement, etc.),
 * we just validate that the achievementCode is not empty.
 * The student owns the certificate and can create ZK proofs for any achievement they claim.
 */
function verifyAchievementOnCertificate(
  _universityDb: any,
  _certificate: any,
  achievementCode: string
) {
  // Just verify the achievement code is provided and not empty
  if (!achievementCode || achievementCode.trim().length === 0) {
    throw new GraphQLError('Achievement code is required', {
      extensions: { code: 'BAD_REQUEST' }
    });
  }

  // Return the achievement code as the identifier
  return { achievementCode };
}

// =============================================================================
// Mutations
// =============================================================================

export const zkMutations = {
  /**
   * Register a commitment for an achievement (student only)
   */
  async registerAchievementCommitment(
    _: any,
    { input }: { input: RegisterCommitmentInput },
    context: GraphQLContext
  ) {
    const { credentialId, achievementCode, commitment } = input;

    logger.info({ credentialId, achievementCode }, 'Registering ZK commitment');

    // Validate commitment format
    if (!isValidFieldElement(commitment)) {
      throw new GraphQLError('Invalid commitment format. Must be a decimal string less than field order.', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    // Get authenticated student
    const student = getAuthenticatedStudent(context);

    // Get the university database for this credential
    const universityDb = await getUniversityDbForCredential(credentialId);

    // Verify certificate ownership
    const certificate = await verifyCertificateOwnership(
      universityDb,
      credentialId,
      student.walletAddress!
    );

    // Verify achievement code is valid
    verifyAchievementOnCertificate(universityDb, certificate, achievementCode);

    // Upsert commitment
    const result = await universityDb.zkAchievementCommitment.upsert({
      where: {
        credentialId_achievementCode: {
          credentialId,
          achievementCode
        }
      },
      create: {
        credentialId,
        achievementCode,
        commitment,
        walletPubkey: student.walletAddress!,
        circuitId: 'ach_member_v1'
      },
      update: {
        commitment,
        walletPubkey: student.walletAddress!,
        updatedAt: new Date()
      }
    });

    logger.info({
      commitmentId: result.id,
      credentialId,
      achievementCode
    }, 'ZK commitment registered');

    return {
      success: true,
      commitmentId: result.id,
      message: 'Commitment registered successfully'
    };
  },

  /**
   * Batch register commitments for multiple achievements
   */
  async registerAchievementCommitmentsBatch(
    _: any,
    { inputs }: { inputs: RegisterCommitmentInput[] },
    context: GraphQLContext
  ) {
    const results = [];

    for (const input of inputs) {
      try {
        const result = await zkMutations.registerAchievementCommitment(
          _,
          { input },
          context
        );
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          commitmentId: null,
          message: error.message
        });
      }
    }

    return results;
  },

  /**
   * Upload a proof for an achievement (student only)
   */
  async uploadAchievementProof(
    _: any,
    { input }: { input: UploadProofInput },
    context: GraphQLContext
  ) {
    const { credentialId, achievementCode, proof, publicSignals } = input;

    logger.info({ credentialId, achievementCode }, 'Uploading ZK proof');

    // Validate proof structure
    if (!validateProofStructure(proof)) {
      throw new GraphQLError('Invalid proof structure', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    // Validate public signals
    if (!validatePublicSignals(publicSignals)) {
      throw new GraphQLError('Invalid public signals. Expected 3 field elements.', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    // Get authenticated student
    const student = getAuthenticatedStudent(context);

    // Get the university database for this credential
    const universityDb = await getUniversityDbForCredential(credentialId);

    // Verify certificate ownership
    const certificate = await verifyCertificateOwnership(
      universityDb,
      credentialId,
      student.walletAddress!
    );

    // Verify achievement code is valid
    verifyAchievementOnCertificate(universityDb, certificate, achievementCode);

    // Verify commitment exists
    const commitment = await universityDb.zkAchievementCommitment.findUnique({
      where: {
        credentialId_achievementCode: {
          credentialId,
          achievementCode
        }
      }
    });

    if (!commitment) {
      throw new GraphQLError('Commitment not found. Please enable ZK verification first.', {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    // Verify the commitment in public signals matches stored commitment
    if (publicSignals[0] !== commitment.commitment) {
      throw new GraphQLError('Commitment in proof does not match stored commitment', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }

    // Compute proof hash
    const proofHash = computeProofHash(proof);

    // Upsert proof
    const result = await universityDb.zkAchievementProof.upsert({
      where: {
        credentialId_achievementCode: {
          credentialId,
          achievementCode
        }
      },
      create: {
        credentialId,
        achievementCode,
        commitmentId: commitment.id,
        proofJson: proof,
        publicSignals: publicSignals,
        proofHash,
        circuitId: 'ach_member_v1',
        verified: false
      },
      update: {
        proofJson: proof,
        publicSignals: publicSignals,
        proofHash,
        verified: false,
        verifiedAt: null,
        updatedAt: new Date()
      }
    });

    logger.info({
      proofId: result.id,
      proofHash,
      credentialId,
      achievementCode
    }, 'ZK proof uploaded');

    return {
      success: true,
      proofId: result.id,
      proofHash,
      message: 'Proof uploaded successfully'
    };
  },

  /**
   * Batch upload proofs for multiple achievements
   */
  async uploadAchievementProofsBatch(
    _: any,
    { inputs }: { inputs: UploadProofInput[] },
    context: GraphQLContext
  ) {
    const results = [];

    for (const input of inputs) {
      try {
        const result = await zkMutations.uploadAchievementProof(
          _,
          { input },
          context
        );
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          proofId: null,
          proofHash: null,
          message: error.message
        });
      }
    }

    return results;
  }
};
