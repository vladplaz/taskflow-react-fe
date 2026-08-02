type FieldValidationRules = {
  email?: boolean
  maxLength?: number
  minLength?: number
  required?: boolean
  trim?: boolean
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateField(
  value: string,
  label: string,
  { email = false, maxLength, minLength, required = true, trim = true }: FieldValidationRules = {},
) {
  const comparableValue = trim ? value.trim() : value

  if (required && !comparableValue) return `${label} is required`
  if (!comparableValue) return null
  if (email && !EMAIL_PATTERN.test(comparableValue)) return `Enter a valid ${label.toLowerCase()}`
  if (minLength !== undefined && comparableValue.length < minLength) {
    return `${label} must be at least ${minLength} characters`
  }
  if (maxLength !== undefined && comparableValue.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer`
  }
  return null
}

export function firstValidationError(...errors: Array<string | null>) {
  return errors.find((error): error is string => Boolean(error)) ?? null
}
