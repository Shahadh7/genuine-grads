import * as yup from 'yup';
import {
  emailSchema,
  passwordSchema,
  confirmPasswordSchema,
  domainSchema,
  optionalUrlSchema,
  requiredString,
  optionalString,
  nameSchema,
} from './common';

const UNIVERSITY_NAME_MIN = 3;
const UNIVERSITY_NAME_MAX = 64;
const UNIVERSITY_URI_MAX = 60;

// University registration schema
export const universityRegistrationSchema = yup.object({
  universityName: nameSchema('University name', UNIVERSITY_NAME_MIN, UNIVERSITY_NAME_MAX),
  email: emailSchema,
  domain: domainSchema,
  country: requiredString('Country'),
  logoUrl: optionalString(),
  websiteUrl: optionalUrlSchema.max(
    UNIVERSITY_URI_MAX,
    `Website URL must be ${UNIVERSITY_URI_MAX} characters or fewer to fit on-chain metadata`
  ),
  adminName: nameSchema('Admin full name'),
  password: passwordSchema,
  confirmPassword: confirmPasswordSchema('password'),
});

// University profile update schema
export const universityProfileSchema = yup.object({
  name: nameSchema('University name'),
  websiteUrl: optionalUrlSchema,
  logoUrl: optionalString(),
});

// Types inferred from schemas
export type UniversityRegistrationFormData = yup.InferType<typeof universityRegistrationSchema>;
export type UniversityProfileFormData = yup.InferType<typeof universityProfileSchema>;
