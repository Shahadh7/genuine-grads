import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { env } from '../env.js';

/**
 * Hash a National ID Card number for privacy-preserving storage
 */
export function hashNIC(nic: string): string {
  return crypto.createHash('sha256').update(nic.trim().toLowerCase()).digest('hex');
}

/**
 * Encrypt sensitive data (e.g., university private keys)
 */
export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, env.MASTER_ENCRYPTION_KEY).toString();
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, env.MASTER_ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Generate a random token for share links, etc.
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const values = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }
  
  return password;
}

/**
 * Verify HMAC signature (for webhooks)
 */
export function verifyHMACSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Prefix to identify encrypted database URLs
const ENCRYPTED_DB_URL_PREFIX = 'enc:v1:';

/**
 * Check if a database URL is encrypted
 */
export function isEncryptedDbUrl(value: string): boolean {
  return value.startsWith(ENCRYPTED_DB_URL_PREFIX);
}

/**
 * Encrypt a database URL for secure storage
 * Returns prefixed encrypted string for identification
 */
export function encryptDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl) {
    throw new Error('Database URL is required');
  }

  // Don't double-encrypt
  if (isEncryptedDbUrl(databaseUrl)) {
    return databaseUrl;
  }

  const encrypted = encrypt(databaseUrl);
  return `${ENCRYPTED_DB_URL_PREFIX}${encrypted}`;
}

/**
 * Decrypt a database URL for use
 * Handles both encrypted and plain URLs for backwards compatibility
 */
export function decryptDatabaseUrl(encryptedUrl: string): string {
  if (!encryptedUrl) {
    throw new Error('Encrypted URL is required');
  }

  // If not encrypted (legacy data), return as-is
  if (!isEncryptedDbUrl(encryptedUrl)) {
    return encryptedUrl;
  }

  // Remove prefix and decrypt
  const encryptedPart = encryptedUrl.slice(ENCRYPTED_DB_URL_PREFIX.length);
  const decrypted = decrypt(encryptedPart);

  if (!decrypted) {
    throw new Error('Failed to decrypt database URL - invalid encryption key or corrupted data');
  }

  return decrypted;
}

