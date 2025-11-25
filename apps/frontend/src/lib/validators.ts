/**
 * Client-side validation utilities
 */

/**
 * Sri Lankan National Identity Card (NIC) Validator
 *
 * Old NIC (10 chars): 9 digits + 'V'/'X'
 *   - Example: 852365478V
 *
 * New NIC (12 digits): All numeric
 *   - Example: 200145602345
 */

const OLD_NIC_REGEX = /^[0-9]{9}[VXvx]$/;
const NEW_NIC_REGEX = /^[0-9]{12}$/;

export interface NICValidationResult {
  isValid: boolean;
  error?: string;
  format?: 'old' | 'new';
}

/**
 * Validates a Sri Lankan NIC number
 */
export function validateNIC(nic: string): NICValidationResult {
  if (!nic || typeof nic !== 'string') {
    return {
      isValid: false,
      error: 'NIC is required',
    };
  }

  const trimmedNIC = nic.trim();

  if (!trimmedNIC) {
    return {
      isValid: false,
      error: 'NIC cannot be empty',
    };
  }

  // Check old format (9 digits + V/X)
  if (OLD_NIC_REGEX.test(trimmedNIC)) {
    return {
      isValid: true,
      format: 'old',
    };
  }

  // Check new format (12 digits)
  if (NEW_NIC_REGEX.test(trimmedNIC)) {
    return {
      isValid: true,
      format: 'new',
    };
  }

  // Neither format matched
  return {
    isValid: false,
    error: 'Invalid NIC format. Must be either 9 digits followed by V/X (e.g., 852365478V) or 12 digits (e.g., 200145602345)',
  };
}

/**
 * Simple helper to check if NIC is valid (returns boolean only)
 */
export function isValidNIC(nic: string): boolean {
  return validateNIC(nic).isValid;
}
