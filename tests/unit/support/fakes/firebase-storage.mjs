// In-memory Cloud Storage stand-in.
const files = new Map() // path -> { size, contentType }
const failures = []
export const calls = []
function err(code) { const e = new Error(code); e.code = code; return e }
function maybeFail(op, p) {
  const i = failures.findIndex((f) => f.op === op && (!f.match || p.includes(f.match)))
  if (i >= 0) { const f = failures[i]; if (--f.times <= 0) failures.splice(i, 1); throw err(f.code) }
}
const BASE = 'https://storage.test/'
export const st = {
  reset() { files.clear(); failures.length = 0; calls.length = 0 },
  has(p) { return files.has(p) },
  paths(prefix = '') { return [...files.keys()].filter((k) => k.startsWith(prefix)).sort() },
  put(p, meta = {}) { files.set(p, meta) },
  fail(op, code = 'storage/unauthorized', match = '', times = 1) { failures.push({ op, code, match, times }) },
  url: (p) => BASE + p,
  calls,
}
export function getStorage() { return { type: 'storage' } }
export function ref(s, p) {
  const fullPath = p.startsWith(BASE) ? p.slice(BASE.length) : p
  return { fullPath, name: fullPath.split('/').pop() }
}
export async function uploadBytes(r, data, meta) {
  calls.push(['uploadBytes', r.fullPath, meta?.contentType ?? null]); maybeFail('uploadBytes', r.fullPath)
  files.set(r.fullPath, { size: data?.size ?? 0, contentType: meta?.contentType ?? data?.type ?? null })
  return { ref: r }
}
export async function getDownloadURL(r) {
  maybeFail('getDownloadURL', r.fullPath)
  if (!files.has(r.fullPath)) throw err('storage/object-not-found')
  return BASE + r.fullPath
}
export async function deleteObject(r) {
  calls.push(['deleteObject', r.fullPath]); maybeFail('deleteObject', r.fullPath)
  if (!files.has(r.fullPath)) throw err('storage/object-not-found')
  files.delete(r.fullPath)
}
