import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/crypto.js';

const ISSUER = 'GenuineGrads';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30;

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generate the otpauth:// URI for authenticator apps
 */
export function generateTOTPUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  return totp.toString();
}

/**
 * Generate a QR code data URL from the TOTP URI
 */
export async function generateQRCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Verify a TOTP token against a secret
 * Uses a window of 1 (allows 1 period before/after current time)
 */
export function verifyTOTPToken(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // delta returns null if invalid, or the time step difference if valid
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Encrypt a TOTP secret for database storage
 */
export function encryptTOTPSecret(secret: string): string {
  return encrypt(secret);
}

/**
 * Decrypt a TOTP secret from database storage
 */
export function decryptTOTPSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

/**
 * Generate TOTP setup data including secret and QR code
 */
export async function generateTOTPSetupData(email: string): Promise<{
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
}> {
  const secret = generateTOTPSecret();
  const uri = generateTOTPUri(secret, email);
  const qrCodeDataUrl = await generateQRCodeDataUrl(uri);

  return {
    secret,
    uri,
    qrCodeDataUrl,
  };
}
