/**
 * Deterministic Secret Derivation from Wallet Signature
 *
 * Instead of storing secrets in browser storage (fragile),
 * we derive secrets deterministically from the student's wallet signature.
 * Same wallet + same message = same signature = same secrets.
 *
 * This approach:
 * - Works across devices (as long as student has wallet)
 * - Survives browser cache clears
 * - Is recoverable via wallet seed phrase
 * - Never stores secrets persistently
 */

import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  BN254_SCALAR_FIELD,
  ZK_DOMAIN_SEPARATOR,
  ZK_STORAGE_KEYS,
  SIGNATURE_CACHE_TTL_MS,
} from './constants';

export interface DerivedSecrets {
  studentSecret: bigint;
  salt: bigint;
}

interface CachedSignature {
  credentialId: string;
  signature: string; // base64
  timestamp: number;
  walletPubkey: string;
}

/**
 * Convert Uint8Array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
  return btoa(binString);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
}

/**
 * Derive a field element from signature using HKDF
 */
async function deriveFieldElement(
  signature: Uint8Array,
  info: string
): Promise<bigint> {
  // Import signature as HKDF key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signature,
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive 256 bits using HKDF-SHA256
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(ZK_DOMAIN_SEPARATOR),
      info: new TextEncoder().encode(info),
    },
    keyMaterial,
    256
  );

  // Convert to bigint and reduce to field
  const derivedBytes = new Uint8Array(derivedBits);
  let hex = '';
  for (const byte of derivedBytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  const bigIntValue = BigInt('0x' + hex);

  return bigIntValue % BN254_SCALAR_FIELD;
}

/**
 * Derive secrets from a signature
 */
async function deriveSecretsFromSignature(
  signature: Uint8Array
): Promise<DerivedSecrets> {
  const studentSecret = await deriveFieldElement(signature, 'student_secret');
  const salt = await deriveFieldElement(signature, 'salt');

  return { studentSecret, salt };
}

/**
 * Get cached signature from sessionStorage
 */
function getCachedSignature(
  credentialId: string,
  walletPubkey: string
): CachedSignature | null {
  try {
    const cached = sessionStorage.getItem(ZK_STORAGE_KEYS.SIGNATURE_CACHE);
    if (!cached) return null;

    const data: CachedSignature = JSON.parse(cached);

    // Validate cache entry
    if (data.credentialId !== credentialId) return null;
    if (data.walletPubkey !== walletPubkey) return null;
    if (Date.now() - data.timestamp > SIGNATURE_CACHE_TTL_MS) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Cache signature in sessionStorage
 */
function cacheSignature(
  credentialId: string,
  walletPubkey: string,
  signature: Uint8Array
): void {
  try {
    const data: CachedSignature = {
      credentialId,
      signature: bytesToBase64(signature),
      timestamp: Date.now(),
      walletPubkey,
    };
    sessionStorage.setItem(
      ZK_STORAGE_KEYS.SIGNATURE_CACHE,
      JSON.stringify(data)
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear cached signature
 */
export function clearCachedSignature(): void {
  try {
    sessionStorage.removeItem(ZK_STORAGE_KEYS.SIGNATURE_CACHE);
  } catch {
    // Ignore
  }
}

/**
 * Derive deterministic ZK secrets from wallet signature.
 * Same wallet + same credentialId = same secrets every time.
 *
 * @param wallet - Connected wallet state
 * @param credentialId - The certificate's mintAddress
 * @returns Derived secrets (studentSecret and salt)
 */
export async function deriveSecrets(
  wallet: WalletContextState,
  credentialId: string
): Promise<DerivedSecrets> {
  if (!wallet.publicKey || !wallet.signMessage) {
    throw new Error(
      'Wallet not connected or does not support message signing'
    );
  }

  const walletPubkey = wallet.publicKey.toBase58();

  // Check cache first
  const cached = getCachedSignature(credentialId, walletPubkey);
  if (cached) {
    const signature = base64ToBytes(cached.signature);
    return deriveSecretsFromSignature(signature);
  }

  // Create deterministic message to sign
  const message = `${ZK_DOMAIN_SEPARATOR}:${credentialId}`;
  const messageBytes = new TextEncoder().encode(message);

  // Sign message - this prompts user wallet
  // IMPORTANT: Same message + same wallet = same signature (Ed25519 is deterministic)
  const signature = await wallet.signMessage(messageBytes);

  // Cache for this session
  cacheSignature(credentialId, walletPubkey, signature);

  return deriveSecretsFromSignature(signature);
}

/**
 * Check if wallet supports deterministic signatures (Ed25519)
 */
export function walletSupportsDeterministicSignatures(
  wallet: WalletContextState
): boolean {
  // Solana wallets use Ed25519 which produces deterministic signatures
  return wallet.publicKey !== null && wallet.signMessage !== undefined;
}

/**
 * Get or derive secrets with session caching
 */
export async function getOrDeriveSecrets(
  wallet: WalletContextState,
  credentialId: string
): Promise<DerivedSecrets> {
  return deriveSecrets(wallet, credentialId);
}
