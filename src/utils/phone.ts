// Single source of truth for phone-number handling, so onboarding and
// edit-profile can't drift out of sync (onboarding previously had no format
// check at all — just required-non-empty — while edit-profile validated but
// never sanitized what actually got typed or saved).
// Thai mobile numbers: 10 digits, starting with 0.
export const PHONE_DIGIT_LENGTH = 10

/** Strips everything but digits and caps the length — call this on every
 * keystroke so a symbol or letter never actually lands in the field. */
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PHONE_DIGIT_LENGTH)
}

export function isValidPhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone)
}
