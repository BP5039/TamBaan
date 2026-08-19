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
 * Reads EXIF timestamp/device from a JPEG file, if present. Returns nulls
 * for non-JPEG images (HEIC, PNG) or photos with stripped metadata — that
 * absence is itself informational, shown honestly rather than hidden.
 */
export function readExif(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    if (file.type !== 'image/jpeg') {
      resolve({ timestamp: null, device: null })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(readExifFromJpeg(reader.result as ArrayBuffer))
      } catch (err) {
        console.error('EXIF parse failed:', err)
        resolve({ timestamp: null, device: null })
      }
    }
    reader.onerror = () => resolve({ timestamp: null, device: null })
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024))
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