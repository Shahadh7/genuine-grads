/**
 * ZK Proof Generator
 *
 * Generates Groth16 proofs for achievement membership claims.
 * Uses Web Workers to avoid blocking the UI during proof generation.
 */

import * as snarkjs from 'snarkjs';
import { ZK_ARTIFACTS, CIRCUIT_ID } from './constants';
import { stringToFieldElement, fieldElementToString } from './hash-utils';
import { ComputedCommitment } from './commitment';

export interface Groth16Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface GeneratedProof {
  achievementCode: string;
  proof: Groth16Proof;
  publicSignals: string[];
  commitment: string;
}

export interface ProofGenerationProgress {
  stage: 'loading_wasm' | 'loading_zkey' | 'generating_proof' | 'complete' | 'error';
  percent: number;
  message: string;
}

export interface ProofGenerationOptions {
  credentialId: string;
  studentSecret: bigint;
  salt: bigint;
  achievements: Array<{
    code: string;
    commitment: ComputedCommitment;
  }>;
  onProgress?: (
    achievementCode: string,
    progress: ProofGenerationProgress
  ) => void;
}

// Cached artifacts to avoid re-downloading
let cachedWasm: ArrayBuffer | null = null;
let cachedZkey: ArrayBuffer | null = null;

/**
 * Load ZK artifacts (wasm and zkey files)
 */
async function loadArtifacts(
  onProgress?: (progress: ProofGenerationProgress) => void
): Promise<{ wasm: ArrayBuffer; zkey: ArrayBuffer }> {
  // Return cached artifacts if available
  if (cachedWasm && cachedZkey) {
    return { wasm: cachedWasm, zkey: cachedZkey };
  }

  onProgress?.({
    stage: 'loading_wasm',
    percent: 10,
    message: 'Loading circuit...',
  });

  // Fetch WASM
  const wasmResponse = await fetch(ZK_ARTIFACTS.WASM_URL);
  if (!wasmResponse.ok) {
    throw new Error(`Failed to load WASM: ${wasmResponse.statusText}`);
  }
  cachedWasm = await wasmResponse.arrayBuffer();

  onProgress?.({
    stage: 'loading_zkey',
    percent: 30,
    message: 'Loading proving key (this may take a moment)...',
  });

  // Fetch zkey (this is the large file)
  const zkeyResponse = await fetch(ZK_ARTIFACTS.ZKEY_URL);
  if (!zkeyResponse.ok) {
    throw new Error(`Failed to load zkey: ${zkeyResponse.statusText}`);
  }
  cachedZkey = await zkeyResponse.arrayBuffer();

  return { wasm: cachedWasm, zkey: cachedZkey };
}

/**
 * Generate a single proof for an achievement
 */
async function generateSingleProof(
  wasm: ArrayBuffer,
  zkey: ArrayBuffer,
  inputs: {
    commitment: string;
    credential_hash: string;
    achievement_hash: string;
    student_secret: string;
    salt: string;
  }
): Promise<{ proof: Groth16Proof; publicSignals: string[] }> {
  // snarkjs expects Uint8Array for wasm and zkey
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    new Uint8Array(wasm),
    new Uint8Array(zkey)
  );

  return { proof: proof as Groth16Proof, publicSignals };
}

/**
 * Generate proofs for all achievements on a certificate
 *
 * @param options - Proof generation options
 * @returns Array of generated proofs
 */
export async function generateProofPack(
  options: ProofGenerationOptions
): Promise<GeneratedProof[]> {
  const { credentialId, studentSecret, salt, achievements, onProgress } =
    options;

  const results: GeneratedProof[] = [];

  // Load artifacts once
  const { wasm, zkey } = await loadArtifacts((progress) => {
    // Report progress for first achievement
    if (achievements.length > 0) {
      onProgress?.(achievements[0].code, progress);
    }
  });

  // Generate proof for each achievement
  for (let i = 0; i < achievements.length; i++) {
    const achievement = achievements[i];

    onProgress?.(achievement.code, {
      stage: 'generating_proof',
      percent: 50 + (i / achievements.length) * 45,
      message: `Generating proof for "${achievement.code}"...`,
    });

    try {
      // Prepare circuit inputs
      const inputs = {
        commitment: achievement.commitment.commitment,
        credential_hash: achievement.commitment.credentialHash,
        achievement_hash: achievement.commitment.achievementHash,
        student_secret: fieldElementToString(studentSecret),
        salt: fieldElementToString(salt),
      };

      // Generate proof
      const { proof, publicSignals } = await generateSingleProof(
        wasm,
        zkey,
        inputs
      );

      results.push({
        achievementCode: achievement.code,
        proof,
        publicSignals,
        commitment: achievement.commitment.commitment,
      });

      onProgress?.(achievement.code, {
        stage: 'complete',
        percent: 50 + ((i + 1) / achievements.length) * 50,
        message: `Proof generated for "${achievement.code}"`,
      });
    } catch (error: any) {
      onProgress?.(achievement.code, {
        stage: 'error',
        percent: 0,
        message: `Failed to generate proof: ${error.message}`,
      });
      throw error;
    }
  }

  return results;
}

/**
 * Preload artifacts in the background
 * Call this early to improve UX when user clicks "Generate Proof"
 */
export async function preloadArtifacts(): Promise<void> {
  try {
    await loadArtifacts();
  } catch {
    // Ignore preload errors - will retry when actually needed
  }
}

/**
 * Clear cached artifacts (for testing or memory management)
 */
export function clearArtifactCache(): void {
  cachedWasm = null;
  cachedZkey = null;
}

/**
 * Check if artifacts are cached
 */
export function areArtifactsCached(): boolean {
  return cachedWasm !== null && cachedZkey !== null;
}
