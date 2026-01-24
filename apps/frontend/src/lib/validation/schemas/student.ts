import * as yup from 'yup';
import {
  emailSchema,
  walletAddressSchema,
  requiredString,
  optionalString,
  nameSchema,
} from './common';
import { nicSchema } from '../adapters/nic-validator';

// String-based year schema for form inputs (transforms to number)
const yearStringSchema = yup
  .string()
  .trim()
  .required('Enrollment year is required')
  .test('valid-year', 'Please enter a valid year (1900-2100)', (value) => {
    if (!value) return false;
    const num = Number(value);
    return !isNaN(num) && num >= 1900 && num <= 2100;
  });

// Optional string that should be a number
const optionalNumberString = yup
  .string()
  .trim()
  .nullable()
  .test('valid-number', 'Must be a valid number', (value) => {
    if (!value) return true;
    const num = Number(value);
    return !isNaN(num);
  });

// Optional GPA string (0-4)
const gpaStringSchema = yup
  .string()
  .trim()
  .nullable()
  .test('valid-gpa', 'GPA must be between 0 and 4', (value) => {
    if (!value) return true;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 4;
  });

// Add student form schema (all string inputs)
export const addStudentSchema = yup.object({
  fullName: nameSchema('Full name'),
  studentNumber: requiredString('Student number'),
  nationalId: nicSchema,
  email: emailSchema,
  department: requiredString('Department'),
  enrollmentYear: yearStringSchema,
  walletAddress: walletAddressSchema,
  courseCode: requiredString('Course code'),
  courseName: requiredString('Course name'),
  courseDescription: optionalString(),
  courseCredits: optionalNumberString,
  degreeType: requiredString('Degree type'),
  enrollmentGpa: gpaStringSchema,
  enrollmentGrade: optionalString(),
});

// Student enrollment schema (for enrolling existing student in course)
export const enrollStudentSchema = yup.object({
  courseCode: requiredString('Course code'),
  courseName: requiredString('Course name'),
  courseDepartment: requiredString('Department'),
  courseDescription: optionalString(),
  courseCredits: optionalNumberString,
  degreeType: yup.string().trim().required('Degree type is required'),
  batchYear: yearStringSchema,
  gpa: gpaStringSchema,
  grade: optionalString(),
});

// Bulk upload row schema (for CSV validation)
export const bulkUploadRowSchema = yup.object({
  fullName: nameSchema('Full name'),
  studentNumber: requiredString('Student number'),
  nationalId: nicSchema,
  email: emailSchema,
  program: requiredString('Program'),
  department: requiredString('Department'),
  enrollmentYear: yearStringSchema,
  walletAddress: walletAddressSchema,
  courseCode: requiredString('Course code'),
  courseName: requiredString('Course name'),
  degreeType: requiredString('Degree type'),
  courseCredits: optionalNumberString,
  enrollmentGpa: gpaStringSchema,
});

// Types inferred from schemas
export type AddStudentFormData = yup.InferType<typeof addStudentSchema>;
export type EnrollStudentFormData = yup.InferType<typeof enrollStudentSchema>;
export type BulkUploadRowData = yup.InferType<typeof bulkUploadRowSchema>;
