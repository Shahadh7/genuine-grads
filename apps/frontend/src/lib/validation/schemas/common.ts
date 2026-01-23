import * as yup from 'yup';

// Email validation
export const emailSchema = yup
  .string()
  .trim()
  .required('Email is required')
  .email('Invalid email format');

// Password validation (basic)
export const passwordSchema = yup
  .string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters');

// Strong password with requirements
export const strongPasswordSchema = yup
  .string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[0-9]/, 'Password must contain at least one number')
  .matches(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Confirm password - pass the field name to reference
export const confirmPasswordSchema = (passwordField: string = 'password') =>
  yup
    .string()
    .required('Please confirm the password')
    .oneOf([yup.ref(passwordField)], 'Passwords do not match');

// URL validation
export const urlSchema = yup
  .string()
  .trim()
  .required('URL is required')
  .url('Please enter a valid URL')
  .matches(/^https?:\/\//, 'URL must start with http:// or https://');

// Optional URL validation
export const optionalUrlSchema = yup
  .string()
  .trim()
  .test('valid-url', 'Please enter a valid URL (e.g., https://university.edu)', (value) => {
    if (!value) return true;
    return /^https?:\/\/.+/.test(value);
  });

// Domain validation
export const domainSchema = yup
  .string()
  .trim()
  .required('Domain is required')
  .matches(
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/,
    'Please enter a valid domain (e.g., university.edu)'
  );

// Wallet address (Solana) - 44 characters base58
export const walletAddressSchema = yup
  .string()
  .trim()
  .required('Wallet address is required')
  .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address format');

// Year validation
export const yearSchema = yup
  .number()
  .typeError('Year must be a number')
  .required('Year is required')
  .min(1900, 'Year must be after 1900')
  .max(2100, 'Year must be before 2100');

// GPA validation (0-4 scale)
export const gpaSchema = yup
  .number()
  .typeError('GPA must be a number')
  .min(0, 'GPA cannot be negative')
  .max(4, 'GPA cannot exceed 4.0');

// TOTP code validation (6 digits)
export const totpCodeSchema = yup
  .string()
  .required('Please enter the complete 6-digit code')
  .matches(/^\d{6}$/, 'Code must be exactly 6 digits');

// Reusable required string with optional min/max
export const requiredString = (fieldName: string, min?: number, max?: number) => {
  let schema = yup.string().trim().required(`${fieldName} is required`);
  if (min) schema = schema.min(min, `${fieldName} must be at least ${min} characters`);
  if (max) schema = schema.max(max, `${fieldName} must be ${max} characters or fewer`);
  return schema;
};

// Name validation (no numbers allowed)
export const nameSchema = (fieldName: string, min?: number, max?: number) => {
  let schema = yup
    .string()
    .trim()
    .required(`${fieldName} is required`)
    .matches(/^[^\d]*$/, `${fieldName} cannot contain numbers`);
  if (min) schema = schema.min(min, `${fieldName} must be at least ${min} characters`);
  if (max) schema = schema.max(max, `${fieldName} must be ${max} characters or fewer`);
  return schema;
};

// Optional string with max length
export const optionalString = (max?: number) => {
  let schema = yup.string().trim().nullable();
  if (max) schema = schema.max(max, `Must be ${max} characters or fewer`);
  return schema;
};

// Phone number validation (basic international format)
export const phoneSchema = yup
  .string()
  .trim()
  .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone number format');

// Optional numeric field
export const optionalNumber = yup
  .number()
  .typeError('Must be a number')
  .nullable()
  .transform((value, originalValue) => (originalValue === '' ? null : value));

// File size validation helper (for use in custom file validators)
export const maxFileSizeMB = (maxMB: number) => maxMB * 1024 * 1024;
