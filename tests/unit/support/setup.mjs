// Browser-like globals for the stores and utils (tests run in Node, no DOM library needed).
globalThis.window = globalThis
window.location = { origin: 'https://tambaan.vercel.app', href: 'https://tambaan.vercel.app/home' }
const et = new EventTarget()
window.addEventListener = et.addEventListener.bind(et)
window.removeEventListener = et.removeEventListener.bind(et)
window.dispatchEvent = et.dispatchEvent.bind(et)
globalThis.document = globalThis.document ?? {
  getElementById: () => null,
  createElement: () => ({}),
}
// Fake <img>/<canvas>: decodes only when __thumbOk is set (Node has no image decoder).
globalThis.__thumbOk = false
globalThis.__imgSize = [1200, 900]
globalThis.Image = class {
  set src(v) {
    this._src = v
    setTimeout(() => {
      if (globalThis.__thumbOk) { [this.width, this.height] = globalThis.__imgSize; this.onload?.() } else this.onerror?.()
    }, 0)
  }
  get src() { return this._src }
}
globalThis.__canvas = null
document.createElement = (tag) => {
  if (tag !== 'canvas') return {}
  const c = {
    width: 0, height: 0, quality: null,
    getContext: () => (globalThis.__noCtx ? null : { drawImage() {} }),
    toBlob(cb, type, q) { c.quality = q; cb(globalThis.__noBlob ? null : new Blob([new Uint8Array(100)], { type })) },
  }
  globalThis.__canvas = c
  return c
}
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(
      (buf) => { this.result = buf; this.onload?.() },
      () => this.onerror?.(),
    )
  }
}
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:fake'
URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {})
const realCreate = URL.createObjectURL
URL.createObjectURL = (b) => { try { return realCreate(b) } catch { return 'blob:fake' } }
const _si = globalThis.setInterval
globalThis.setInterval = (...a) => { const t = _si(...a); t.unref?.(); return t }
console.error = () => {} // the source logs expected failures; keep output clean
console.warn = () => {}

