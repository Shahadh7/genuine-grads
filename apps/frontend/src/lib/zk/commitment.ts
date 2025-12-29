/**
 * Commitment computation using Poseidon hash
 *
 * Commitment formula:
 * C = Poseidon(credential_hash, student_secret, salt, achievement_hash)
 *
 * This binds the student to a specific (credential, achievement) pair
 * without revealing their secret.
 */

import { buildPoseidon } from 'circomlibjs';
import { stringToFieldElement, fieldElementToString } from './hash-utils';

// Singleton Poseidon instance (lazy loaded)
let poseidonInstance: any = null;

/**
 * Get or initialize the Poseidon hash function
 */
async function getPoseidon(): Promise<any> {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Compute Poseidon hash of multiple field elements
 */
async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();
  const hash = poseidon(inputs);
  return poseidon.F.toObject(hash);
}

export interface CommitmentInputs {
  credentialId: string; // mintAddress
  studentSecret: bigint;
  salt: bigint;
  achievementCode: string; // badgeTitle
}

export interface ComputedCommitment {
  commitment: string; // Decimal string
  credentialHash: string; // Decimal string
  achievementHash: string; // Decimal string
}

/**
 * Compute a commitment for a (credential, achievement) pair
 *
 * @param inputs - The commitment inputs
 * @returns The computed commitment and intermediate hashes
 */
export async function computeCommitment(
  inputs: CommitmentInputs
): Promise<ComputedCommitment> {
  const { credentialId, studentSecret, salt, achievementCode } = inputs;

  // Compute credential and achievement hashes
  const credentialHash = await stringToFieldElement(credentialId);
  const achievementHash = await stringToFieldElement(achievementCode);

  // Compute Poseidon commitment
  // C = Poseidon(credential_hash, student_secret, salt, achievement_hash)
  const commitment = await poseidonHash([
    credentialHash,
    studentSecret,
    salt,
    achievementHash,
  ]);

  return {
    commitment: fieldElementToString(commitment),
    credentialHash: fieldElementToString(credentialHash),
    achievementHash: fieldElementToString(achievementHash),
  };
}

/**
 * Compute commitments for multiple achievements on a certificate
 */
export async function computeCommitmentsForCertificate(
  credentialId: string,
  studentSecret: bigint,
  salt: bigint,
  achievementCodes: string[]
): Promise<Map<string, ComputedCommitment>> {
  const commitments = new Map<string, ComputedCommitment>();

  for (const achievementCode of achievementCodes) {
    const commitment = await computeCommitment({
      credentialId,
      studentSecret,
      salt,
      achievementCode,
    });
    commitments.set(achievementCode, commitment);
  }

  return commitments;
}
