import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to verification key (relative to backend root)
const VKEY_PATH = path.join(__dirname, '..', '..', '..', 'zk-artifacts', 'ach_member_v1_vkey.json');

// BN254 scalar field order
const BN254_SCALAR_FIELD = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

export interface Groth16Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface VerificationResult {
  verified: boolean;
  failureReason?: string;
  proofHash: string;
}

/**
 * Compute SHA256 hash of proof for audit trail
 */
export function computeProofHash(proof: Groth16Proof): string {
  const proofString = JSON.stringify(proof);
  return crypto.createHash('sha256').update(proofString).digest('hex');
}

/**
 * Convert string to field element via SHA256
 * Must match frontend implementation exactly
 */
export function stringToFieldElement(input: string): bigint {
  const hash = crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  const hashBigInt = BigInt('0x' + hash);
  return hashBigInt % BN254_SCALAR_FIELD;
}

/**
 * Validate that a value is a valid field element (decimal string < field order)
 */
export function isValidFieldElement(value: string): boolean {
  try {
    const bigIntValue = BigInt(value);
    return bigIntValue >= 0n && bigIntValue < BN254_SCALAR_FIELD;
  } catch {
    return false;
  }
}

/**
 * Validate proof structure
 */
export function validateProofStructure(proof: any): proof is Groth16Proof {
  if (!proof || typeof proof !== 'object') return false;
  if (!Array.isArray(proof.pi_a) || proof.pi_a.length !== 3) return false;
  if (!Array.isArray(proof.pi_b) || proof.pi_b.length !== 3) return false;
  if (!Array.isArray(proof.pi_c) || proof.pi_c.length !== 3) return false;
  if (proof.protocol !== 'groth16') return false;
  if (proof.curve !== 'bn128') return false;
  return true;
}

/**
 * Validate public signals structure
 * Expected: [commitment, credential_hash, achievement_hash]
 */
export function validatePublicSignals(signals: any): signals is string[] {
  if (!Array.isArray(signals)) return false;
  if (signals.length !== 3) return false;
  return signals.every(s => typeof s === 'string' && isValidFieldElement(s));
}

/**
 * Verify that public signals match expected values
 */
export function verifyPublicSignalsMatch(
  publicSignals: string[],
  expectedCommitment: string,
  credentialId: string,
  achievementCode: string
): { valid: boolean; reason?: string } {
  // Compute expected hashes
  const expectedCredentialHash = stringToFieldElement(credentialId).toString();
  const expectedAchievementHash = stringToFieldElement(achievementCode).toString();

  // Check commitment matches
  if (publicSignals[0] !== expectedCommitment) {
    return {
      valid: false,
      reason: 'Commitment in proof does not match stored commitment'
    };
  }

  // Check credential hash matches
  if (publicSignals[1] !== expectedCredentialHash) {
    return {
      valid: false,
      reason: 'Credential hash in proof does not match expected value'
    };
  }

  // Check achievement hash matches
  if (publicSignals[2] !== expectedAchievementHash) {
    return {
      valid: false,
      reason: 'Achievement hash in proof does not match expected value'
    };
  }

  return { valid: true };
}

/**
 * Verify a Groth16 proof using snarkjs CLI
 *
 * For MVP, we use subprocess execution of snarkjs.
 * This is simpler than native verification and sufficient for Phase 1.
 */
export async function verifyGroth16Proof(
  proof: Groth16Proof,
  publicSignals: string[]
): Promise<VerificationResult> {
  const proofHash = computeProofHash(proof);

  // Validate inputs
  if (!validateProofStructure(proof)) {
    return {
      verified: false,
      failureReason: 'Invalid proof structure',
      proofHash
    };
  }

  if (!validatePublicSignals(publicSignals)) {
    return {
      verified: false,
      failureReason: 'Invalid public signals',
      proofHash
    };
  }

  // Check verification key exists
  if (!fs.existsSync(VKEY_PATH)) {
    logger.error({ path: VKEY_PATH }, 'Verification key not found');
    return {
      verified: false,
      failureReason: 'Verification key not configured',
      proofHash
    };
  }

  // Create temp files for snarkjs
  const tempDir = path.join('/tmp', `zk-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const proofPath = path.join(tempDir, 'proof.json');
  const publicPath = path.join(tempDir, 'public.json');

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Write proof and public signals to temp files
    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));

    // Execute snarkjs verification
    const result = await executeSnarkjsVerify(VKEY_PATH, publicPath, proofPath);

    return {
      verified: result.verified,
      failureReason: result.verified ? undefined : result.error,
      proofHash
    };

  } catch (error: any) {
    logger.error({ error, proofHash }, 'Error during proof verification');
    return {
      verified: false,
      failureReason: `Verification error: ${error.message}`,
      proofHash
    };
  } finally {
    // Clean up temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute snarkjs groth16 verify command
 */
function executeSnarkjsVerify(
  vkeyPath: string,
  publicPath: string,
  proofPath: string
): Promise<{ verified: boolean; error?: string }> {
  return new Promise((resolve) => {
    const args = ['snarkjs', 'groth16', 'verify', vkeyPath, publicPath, proofPath];

    logger.debug({ args }, 'Executing snarkjs verify');

    const proc = spawn('npx', args, {
      cwd: path.join(__dirname, '..', '..', '..'),
      timeout: 30000, // 30 second timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      logger.debug({ code, stdout, stderr }, 'snarkjs verify completed');

      // snarkjs verify outputs "OK!" on success
      if (stdout.includes('OK!') || stdout.includes('snarkJS: OK!')) {
        resolve({ verified: true });
      } else if (stdout.includes('INVALID') || stderr.includes('INVALID')) {
        resolve({ verified: false, error: 'Proof is invalid' });
      } else if (code !== 0) {
        resolve({ verified: false, error: stderr || 'Verification process failed' });
      } else {
        // Default to checking for OK pattern
        resolve({ verified: stdout.toLowerCase().includes('ok'), error: stderr || undefined });
      }
    });

    proc.on('error', (error) => {
      logger.error({ error }, 'snarkjs process error');
      resolve({ verified: false, error: `Process error: ${error.message}` });
    });
  });
}

/**
 * Full verification flow including public signal validation
 */
export async function verifyAchievementProof(
  proof: Groth16Proof,
  publicSignals: string[],
  expectedCommitment: string,
  credentialId: string,
  achievementCode: string
): Promise<VerificationResult> {
  const proofHash = computeProofHash(proof);

  // Step 1: Validate public signals match expected values
  const signalsCheck = verifyPublicSignalsMatch(
    publicSignals,
    expectedCommitment,
    credentialId,
    achievementCode
  );

  if (!signalsCheck.valid) {
    return {
      verified: false,
      failureReason: signalsCheck.reason,
      proofHash
    };
  }

  // Step 2: Verify the cryptographic proof
  return verifyGroth16Proof(proof, publicSignals);
}
