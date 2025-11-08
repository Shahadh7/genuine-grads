import { nanoid, customAlphabet } from 'nanoid';

/**
 * Generate a unique certificate number
 * Format: {UNIVERSITY_CODE}-{YEAR}-{DEPT}-{SEQUENCE}
 * Example: MIT-2024-CS-00123
 */
export function generateCertificateNumber(
  universityCode: string,
  year: number,
  department: string,
  sequence: number
): string {
  const paddedSequence = String(sequence).padStart(5, '0');
  return `${universityCode.toUpperCase()}-${year}-${department.toUpperCase()}-${paddedSequence}`;
}

/**
 * Generate a short unique ID for share links
 */
export function generateShortId(length: number = 10): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const customNanoid = customAlphabet(alphabet, length);
  return customNanoid();
}

/**
 * Generate a job ID for background tasks
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${nanoid(10)}`;
}

/**
 * Generate a batch name
 */
export function generateBatchName(universityName: string, year: number): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${universityName}-Batch-${year}-${timestamp}`;
}

