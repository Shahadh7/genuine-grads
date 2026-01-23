import * as yup from 'yup';
import { emailSchema, totpCodeSchema } from './common';

// Login form schema
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Password is required'),
});

// TOTP verification schema
export const totpVerificationSchema = yup.object({
  code: totpCodeSchema,
});

// Types inferred from schemas
export type LoginFormData = yup.InferType<typeof loginSchema>;
export type TotpFormData = yup.InferType<typeof totpVerificationSchema>;
