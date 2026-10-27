// Fake heic2any: mode 'ok' returns a JPEG blob of `size` bytes, 'fail' throws.
export const heicState = { mode: 'ok', size: 1000, calls: 0 }
export default async function heic2any({ blob, toType }) {
  heicState.calls++
  if (heicState.mode === 'fail') throw new Error('ERR_LIBHEIF format not supported')
  return new Blob([new Uint8Array(heicState.size)], { type: toType })
}
