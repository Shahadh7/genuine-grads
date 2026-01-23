import * as yup from 'yup';

// Certificate verification schema
export const certificateVerificationSchema = yup.object({
  certificateId: yup.string().trim().required('Please enter a certificate ID'),
});

// Types inferred from schemas
export type CertificateVerificationFormData = yup.InferType<typeof certificateVerificationSchema>;
