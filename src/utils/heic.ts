import { MAX_IMAGE_SIZE_BYTES } from '@/constants/fileValidation'

/**
 * iPhones save photos as HEIC by default, but most browsers (Chrome,
 * Firefox, Edge) can't display HEIC. To keep HEIC uploads working for
 * everyone, every image picker passes the chosen file through
 * prepareImageFile() right after validation: HEIC/HEIF is converted to JPEG
 * in the browser, anything else is returned untouched.
 *
 * heic2any is ~1 MB, so it's only loaded the first time someone actually
 * picks a HEIC photo.
 */

export function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

export type PreparedImage = { file: File; error: null } | { file: null; error: string }

export async function prepareImageFile(file: File): Promise<PreparedImage> {
  if (!isHeic(file)) return { file, error: null }

  try {
    const { default: heic2any } = await import('heic2any')
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    const blob = Array.isArray(result) ? result[0] : result
    const jpegName = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg'
    const converted = new File([blob], jpegName, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })

    if (converted.size > MAX_IMAGE_SIZE_BYTES) {
      const mb = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))
      return { file: null, error: `That photo is too large once converted — max ${mb}MB.` }
    }
    return { file: converted, error: null }
  } catch (err) {
    console.error('HEIC conversion failed:', err)
    return { file: null, error: "Couldn't read this HEIC photo. Try a JPG or PNG instead." }
  }
}
