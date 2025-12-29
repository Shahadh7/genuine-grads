/**
 * ZK Constants and Configuration
 */

// BN254 scalar field order (used by Groth16)
export const BN254_SCALAR_FIELD = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

// Domain separator for wallet signature derivation
export const ZK_DOMAIN_SEPARATOR = 'GenuineGrads:ZK:v1';

// Circuit configuration
export const CIRCUIT_ID = 'ach_member_v1';

// Artifact URLs (relative to public folder)
export const ZK_ARTIFACTS = {
  WASM_URL: '/zk-artifacts/ach_member_v1.wasm',
  ZKEY_URL: '/zk-artifacts/ach_member_v1.zkey',
};

// Session storage keys
export const ZK_STORAGE_KEYS = {
  SIGNATURE_CACHE: 'zk_wallet_sig_cache',
};

// Signature cache TTL (30 minutes)
export const SIGNATURE_CACHE_TTL_MS = 30 * 60 * 1000;
