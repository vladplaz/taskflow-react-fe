import { describe, expect, it } from 'vitest'

import { firstValidationError, validateField } from './validation'

describe('validateField', () => {
  it('validates required values after trimming whitespace', () => {
    expect(validateField('   ', 'Workspace name')).toBe('Workspace name is required')
  })

  it('validates minimum and maximum lengths', () => {
    expect(validateField('short', 'Password', { minLength: 8, trim: false })).toBe(
      'Password must be at least 8 characters',
    )
    expect(validateField('toolong', 'Name', { maxLength: 5 })).toBe('Name must be 5 characters or fewer')
  })

  it('validates email addresses without browser constraint validation', () => {
    expect(validateField('person@example.com', 'Email address', { email: true, maxLength: 254 })).toBeNull()
    expect(validateField('not-an-email', 'Email address', { email: true })).toBe(
      'Enter a valid email address',
    )
  })

  it('returns the first validation error', () => {
    expect(firstValidationError(null, 'Second error', 'Third error')).toBe('Second error')
  })
})
