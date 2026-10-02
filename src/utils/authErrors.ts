const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Check your connection and try again.',
}

export function friendlyAuthError(code: string): string {
  return MESSAGES[code] ?? 'Something went wrong. Please try again.'
}

export interface FieldAuthError {
  field: 'email' | 'password' | 'general'
  message: string
}

// Routes a Firebase error to the specific field it's actually about, so the
// form can show a short message right under that input instead of a long
// banner at the top. Errors that aren't about one particular field (account
// disabled, rate-limited, offline) stay general — there's no field to pin
// those to honestly.
const FIELD_MESSAGES: Record<string, FieldAuthError> = {
  'auth/invalid-email': { field: 'email', message: 'Invalid email.' },
  'auth/email-already-in-use': { field: 'email', message: 'An account with this email already exists.' },
  'auth/user-not-found': { field: 'password', message: 'Invalid email or password.' },
  'auth/wrong-password': { field: 'password', message: 'Invalid email or password.' },
  'auth/invalid-credential': { field: 'password', message: 'Invalid email or password.' },
  'auth/weak-password': { field: 'password', message: 'Invalid password.' },
}

export function fieldAuthError(code: string): FieldAuthError {
  return FIELD_MESSAGES[code] ?? { field: 'general', message: friendlyAuthError(code) }
}