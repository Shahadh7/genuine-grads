import * as yup from 'yup';

/**
 * Validate a single value against a schema
 */
export async function validateValue<T>(
  schema: yup.Schema<T>,
  value: unknown
): Promise<{ isValid: boolean; error?: string }> {
  try {
    await schema.validate(value);
    return { isValid: true };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return { isValid: false, error: err.message };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}

/**
 * Validate form data and return errors object
 */
export async function validateFormData<T extends object>(
  schema: yup.ObjectSchema<T>,
  data: T
): Promise<{ isValid: boolean; errors: Record<string, string> }> {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      err.inner.forEach((error) => {
        if (error.path && !errors[error.path]) {
          errors[error.path] = error.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { _form: 'Validation failed' } };
  }
}

/**
 * Validate a single field in an object
 */
export async function validateField<T extends object>(
  schema: yup.ObjectSchema<T>,
  data: T,
  field: keyof T
): Promise<{ isValid: boolean; error?: string }> {
  try {
    await schema.validateAt(String(field), data);
    return { isValid: true };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return { isValid: false, error: err.message };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}

/**
 * Synchronous validation - useful when async is not needed
 */
export function validateFormDataSync<T extends object>(
  schema: yup.ObjectSchema<T>,
  data: T
): { isValid: boolean; errors: Record<string, string> } {
  try {
    schema.validateSync(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      err.inner.forEach((error) => {
        if (error.path && !errors[error.path]) {
          errors[error.path] = error.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { _form: 'Validation failed' } };
  }
}
