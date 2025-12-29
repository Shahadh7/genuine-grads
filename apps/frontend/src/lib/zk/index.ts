/**
 * ZK Module - Zero-Knowledge Proof utilities for GenuineGrads
 *
 * This module provides:
 * - Deterministic secret derivation from wallet signatures
 * - Poseidon commitment computation
 * - Groth16 proof generation
 * - Hash utilities for field element conversion
 */

// Re-export everything
export * from './constants';
export * from './hash-utils';
export * from './deterministic-secrets';
export * from './commitment';
export * from './proof-generator';
