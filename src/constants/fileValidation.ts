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