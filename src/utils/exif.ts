export interface ExifData {
  timestamp: number | null
  device: string | null
}

function readTiffString(view: DataView, tiffStart: number, entryOffset: number, little: boolean): string {
  const numValues = view.getUint32(entryOffset + 4, little)
  const valueOffset = entryOffset + 8
  const strOffset = numValues > 4 ? tiffStart + view.getUint32(valueOffset, little) : valueOffset
  let str = ''
  for (let j = 0; j < numValues - 1; j++) {
    str += String.fromCharCode(view.getUint8(strOffset + j))
  }
  return str
}

function parseTiff(view: DataView, tiffStart: number): ExifData {
  const little = view.getUint16(tiffStart) === 0x4949
  const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little)

  let make = ''
  let model = ''
  let dateTime: string | null = null
  let exifIfdOffset: number | null = null

  const count = view.getUint16(ifd0Offset, little)
  for (let i = 0; i < count; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12
    const tag = view.getUint16(entryOffset, little)
    if (tag === 0x010f) make = readTiffString(view, tiffStart, entryOffset, little)
    else if (tag === 0x0110) model = readTiffString(view, tiffStart, entryOffset, little)
    else if (tag === 0x0132) dateTime = readTiffString(view, tiffStart, entryOffset, little)
    else if (tag === 0x8769) {
      exifIfdOffset = tiffStart + view.getUint32(entryOffset + 8, little)
    }
  }

  if (exifIfdOffset !== null) {
    const exifCount = view.getUint16(exifIfdOffset, little)
    for (let i = 0; i < exifCount; i++) {
      const entryOffset = exifIfdOffset + 2 + i * 12
      if (view.getUint16(entryOffset, little) === 0x9003) {
        dateTime = readTiffString(view, tiffStart, entryOffset, little)
      }
    }
  }

  let timestamp: number | null = null
  if (dateTime) {
    const m = dateTime.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
    if (m) {
      const [, y, mo, d, h, mi, s] = m
      timestamp = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
      ).getTime()
    }
  }

  const device = `${make} ${model}`.trim()
  return { timestamp, device: device || null }
}

function readExifFromJpeg(buffer: ArrayBuffer): ExifData {
  const view = new DataView(buffer)
  if (view.getUint16(0) !== 0xffd8) return { timestamp: null, device: null }

  let offset = 2
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset)
    if (marker === 0xffe1) {
      const exifStart = offset + 4
      if (
        view.getUint32(exifStart) === 0x45786966 &&
        view.getUint16(exifStart + 4) === 0x0000
      ) {
        return parseTiff(view, exifStart + 6)
      }
      return { timestamp: null, device: null }
    }
    if ((marker & 0xff00) !== 0xff00) break
    offset += 2 + view.getUint16(offset + 2)
  }
  return { timestamp: null, device: null }
}

/**
 * HEIC keeps its EXIF block inside the file's item data as
 * "Exif\0\0" followed by a normal TIFF header ("MM\0*" or "II*\0").
 * Scanning for that pair is simpler than walking the HEIF box tree and is
 * reliable enough for a date + device line.
 */
function readExifFromHeic(buffer: ArrayBuffer): ExifData {
  const view = new DataView(buffer)
  for (let i = 0; i < view.byteLength - 10; i++) {
    if (
      view.getUint32(i) === 0x45786966 && // "Exif"
      view.getUint16(i + 4) === 0x0000
    ) {
      const tiff = i + 6
      const byteOrder = view.getUint16(tiff)
      if (byteOrder === 0x4d4d || byteOrder === 0x4949) {
        return parseTiff(view, tiff)
      }
    }
  }
  return { timestamp: null, device: null }
}

function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
}

/**
 * Reads EXIF timestamp/device from a JPEG or HEIC file, if present. Returns
 * nulls for PNGs or photos with stripped metadata (screenshots, photos saved
 * from chat apps or social media) — that absence is itself informational,
 * shown honestly rather than hidden.
 *
 * Call this on the ORIGINAL file: HEIC photos are converted to JPEG for
 * display, and the conversion drops the metadata.
 */
export function readExif(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const heic = isHeicFile(file)
    if (file.type !== 'image/jpeg' && !heic) {
      resolve({ timestamp: null, device: null })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        resolve(heic ? readExifFromHeic(buffer) : readExifFromJpeg(buffer))
      } catch (err) {
        console.error('EXIF parse failed:', err)
        resolve({ timestamp: null, device: null })
      }
    }
    reader.onerror = () => resolve({ timestamp: null, device: null })
    // JPEG EXIF sits in the first few KB; in HEIC it can be anywhere, so
    // read the whole file (it's already capped at 8 MB by validation).
    reader.readAsArrayBuffer(heic ? file : file.slice(0, 128 * 1024))
  })
}

export function formatExif(exif: ExifData): string {
  if (!exif.timestamp && !exif.device) return 'No camera info found'
  const parts: string[] = []
  if (exif.timestamp) {
    parts.push(
      new Date(exif.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    )
  }
  if (exif.device) parts.push(exif.device)
  return parts.join(' · ')
}