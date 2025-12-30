import { nanoid, customAlphabet } from 'nanoid';

/**
 * Generate a unique certificate number
 * Format: {UNIVERSITY_CODE}-{YEAR}-{DEPT}-{SEQUENCE}
 * Example: MIT-2024-CS-00123
 * 
 * Note: Department names are sanitized by:
 * - Removing all spaces and special characters
 * - Converting to uppercase
 * - Limiting to 10 characters for readability
 */
export function generateCertificateNumber(
  universityCode: string,
  year: number,
  department: string,
  sequence: number
): string {
  // Sanitize department: remove spaces and special chars, limit length
  const sanitizedDept = department
    .replace(/[^a-zA-Z0-9]/g, '') // Remove spaces and special characters
    .toUpperCase()
    .substring(0, 10); // Limit to 10 chars for reasonable length
  
  const paddedSequence = String(sequence).padStart(5, '0');
  return `${universityCode.toUpperCase()}-${year}-${sanitizedDept}-${paddedSequence}`;
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

