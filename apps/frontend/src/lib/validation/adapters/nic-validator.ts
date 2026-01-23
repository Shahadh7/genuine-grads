import * as yup from 'yup';
import { validateNIC } from '@/lib/validators';

/**
 * NIC schema that wraps the existing validateNIC function
 * Supports both old (9 digits + V/X) and new (12 digits) Sri Lankan NIC formats
 */
export const nicSchema = yup
  .string()
  .trim()
  .required('NIC is required')
  .test('valid-nic', 'Invalid NIC format', function (value) {
    if (!value) return false;
    const result = validateNIC(value);
    if (!result.isValid) {
      return this.createError({ message: result.error || 'Invalid NIC format' });
    }
    return true;
  });

/**
 * Optional NIC schema - only validates if a value is provided
 */
export const optionalNicSchema = yup
  .string()
  .trim()
  .nullable()
  .test('valid-nic', 'Invalid NIC format', function (value) {
    if (!value) return true;
    const result = validateNIC(value);
    if (!result.isValid) {
      return this.createError({ message: result.error || 'Invalid NIC format' });
    }
    return true;
  });
