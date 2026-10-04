// Single source of truth for password strength, so signup, reset, and
// change-password can never disagree with each other again (signup used to
// accept 6 characters while the new reset flow required 8).
export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRequirement {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'letterNumber',
    label: 'Contains a letter and a number',
    test: (password) => /[a-zA-Z]/.test(password) && /[0-9]/.test(password),
  },
]

export const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.'

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password))
}