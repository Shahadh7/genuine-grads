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

