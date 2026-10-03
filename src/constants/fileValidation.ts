export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/heic', 'image/heif']
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.heic', '.heif']
export const ALLOWED_IMAGE_LABEL = 'PNG, JPG, HEIC/HEIF'
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024 // 8MB

export function validateImageFile(file: File): string | null {
  const name = file.name.toLowerCase()
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
  const hasAllowedType = ALLOWED_IMAGE_TYPES.includes(file.type)

  // Some browsers report HEIC/HEIF files with a blank or generic mime type,
  // so we accept a match on either the reported type or the extension.
  if (!hasAllowedType && !hasAllowedExtension) {
    return `${ALLOWED_IMAGE_LABEL} only.`
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const mb = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))
    return `That file is too large — max ${mb}MB.`
  }
  return null
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}

// validateImageFile() above lets a file through on its extension alone,
// specifically for the blank/generic mime type some browsers report for
// HEIC/HEIF (and occasionally other formats). But Storage's security rules
// check only the declared content type of the uploaded bytes — there's no
// extension fallback there — so a file that passed validation on its
// extension alone would get silently rejected by Storage (permission-denied)
// if uploadBytes() trusted that same blank/generic file.type. Call this at
// every upload site instead, so what's actually sent always matches what
// the rules expect.
export function imageContentType(file: File): string {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return file.type
  const name = file.name.toLowerCase()
  const match = Object.keys(EXTENSION_CONTENT_TYPES).find((ext) => name.endsWith(ext))
  return match ? EXTENSION_CONTENT_TYPES[match] : file.type
}