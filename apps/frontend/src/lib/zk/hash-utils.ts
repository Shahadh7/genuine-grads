/**
 * Hash utilities for ZK proof generation
 * Converts strings to field elements for use in Poseidon hashing
 */

import { BN254_SCALAR_FIELD } from './constants';

/**
 * Convert a Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a string to a field element via SHA256
 * This must match the backend implementation exactly!
 *
 * Process:
 * 1. Encode string as UTF-8
 * 2. Compute SHA-256 hash
 * 3. Convert hash to BigInt
 * 4. Reduce modulo BN254 scalar field order
 */
export async function stringToFieldElement(input: string): Promise<bigint> {
  const encoder = new TextEncoder();
  const data = new Uint8Array(encoder.encode(input)).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = bytesToHex(hashArray);
  const hashBigInt = BigInt('0x' + hashHex);
  return hashBigInt % BN254_SCALAR_FIELD;
}

/**
 * Validate that a value is a valid field element
 */
export function isValidFieldElement(value: bigint): boolean {
  return value >= 0n && value < BN254_SCALAR_FIELD;
}

/**
 * Convert a bigint to a decimal string (for circuit input)
 */
export function fieldElementToString(value: bigint): string {
  return value.toString();
}

/**
 * Parse a decimal string to a bigint field element
 */
export function stringToFieldElementSync(decimalString: string): bigint {
  const value = BigInt(decimalString);
  if (!isValidFieldElement(value)) {
    throw new Error('Value is not a valid field element');
  }
  return value;
}
