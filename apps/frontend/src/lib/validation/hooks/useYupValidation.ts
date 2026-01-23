'use client';

import { useState, useCallback, useRef } from 'react';
import * as yup from 'yup';

interface ValidationOptions<T> {
  schema: yup.ObjectSchema<T>;
  initialValues: T;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  clearErrorOnChange?: boolean;
}

interface UseYupValidationReturn<T> {
  formData: T;
  errors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  handleInputChange: (field: keyof T, value: T[keyof T]) => void;
  handleBlur: (field: keyof T) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  clearErrors: () => void;
  clearFieldError: (field: keyof T) => void;
  isValid: boolean;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  reset: (values?: T) => void;
}

export function useYupValidation<T extends Record<string, unknown>>({
  schema,
  initialValues,
  validateOnChange = false,
  validateOnBlur = false,
  clearErrorOnChange = true,
}: ValidationOptions<T>): UseYupValidationReturn<T> {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const touchedRef = useRef<Set<string>>(new Set());
  const initialValuesRef = useRef<T>(initialValues);

  // Validate a single field
  const validateField = useCallback(
    async (field: keyof T): Promise<boolean> => {
      try {
        await schema.validateAt(String(field), formData);
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[String(field)];
          return newErrors;
        });
        return true;
      } catch (err) {
        if (err instanceof yup.ValidationError) {
          setErrors((prev) => ({
            ...prev,
            [String(field)]: err.message,
          }));
        }
        return false;
      }
    },
    [schema, formData]
  );

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      await schema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path && !newErrors[error.path]) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [schema, formData]);

  // Handle input change
  const handleInputChange = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user types (default behavior)
      if (clearErrorOnChange && errors[String(field)]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[String(field)];
          return newErrors;
        });
      }

      // Validate on change if enabled and field has been touched
      if (validateOnChange && touchedRef.current.has(String(field))) {
        // Use setTimeout to validate after state update
        setTimeout(() => {
          schema
            .validateAt(String(field), { ...formData, [field]: value })
            .then(() => {
              setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[String(field)];
                return newErrors;
              });
            })
            .catch((err) => {
              if (err instanceof yup.ValidationError) {
                setErrors((prev) => ({
                  ...prev,
                  [String(field)]: err.message,
                }));
              }
            });
        }, 0);
      }
    },
    [clearErrorOnChange, errors, validateOnChange, schema, formData]
  );

  // Handle blur for field validation
  const handleBlur = useCallback(
    (field: keyof T) => {
      touchedRef.current.add(String(field));
      if (validateOnBlur) {
        validateField(field);
      }
    },
    [validateOnBlur, validateField]
  );

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Clear single field error
  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[String(field)];
      return newErrors;
    });
  }, []);

  // Reset form to initial values
  const reset = useCallback((values?: T) => {
    setFormData(values ?? initialValuesRef.current);
    setErrors({});
    touchedRef.current.clear();
  }, []);

  // Check if form has no errors
  const isValid = Object.keys(errors).length === 0;

  return {
    formData,
    errors,
    setFormData,
    handleInputChange,
    handleBlur,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
    isValid,
    setErrors,
    reset,
  };
}
