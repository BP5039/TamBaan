// In-memory Firestore stand-in. Paths are 'col/id/sub/id'. Tests reach the
// data through `fs` (export) to seed, inspect and inject failures.
const docs = new Map() // path -> data
const listeners = new Set()
let autoId = 0
const failures = [] // { op, match, code, times }
export const calls = []

function err(code) {
  const e = new Error(code)
  e.code = code
  e.name = 'FirebaseError'
  return e
}
function maybeFail(op, p) {
  const i = failures.findIndex((f) => (f.op === op || f.op === '*') && (!f.match || p.includes(f.match)))
  if (i >= 0) {
    const f = failures[i]
    if (--f.times <= 0) failures.splice(i, 1)
    throw err(f.code)
  }
}
// Plain deep copy (works on Vue reactive proxies, which real Firestore accepts).
function clone(v) {
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(clone)
  if (v instanceof Blob) return v
  const o = {}
  for (const k of Object.keys(v)) o[k] = clone(v[k])
  return o
}

export const fs = {
  reset() {
    docs.clear(); listeners.clear(); failures.length = 0; calls.length = 0; autoId = 0
  },
  set(p, data) { docs.set(p, clone(data)) },
  get(p) { return clone(docs.get(p)) },
  has(p) { return docs.has(p) },
  paths(prefix = '') { return [...docs.keys()].filter((k) => k.startsWith(prefix)).sort() },
  fail(op, code = 'permission-denied', match = '', times = 1) { failures.push({ op, code, match, times }) },
  listenerCount() { return listeners.size },
  calls,
}

export function getFirestore() { return { type: 'firestore' } }

function join(base, segs) {
  const parts = [base, ...segs].filter((s) => s !== undefined && s !== null && s !== '')
  return parts.join('/')
}
export function doc(parent, ...segs) {
  let p
  if (parent && parent.type === 'collection') {
    p = segs.length ? join(parent.path, segs) : join(parent.path, ['auto-' + ++autoId])
  } else p = join('', segs)
  return { type: 'doc', path: p, id: p.split('/').pop() }
}
export function collection(parent, ...segs) {
  const base = parent && parent.type === 'doc' ? parent.path : ''
  const p = join(base, segs)
  return { type: 'collection', path: p, id: p.split('/').pop() }
}
export function where(field, op, value) { return { kind: 'where', field, op, value } }
export function orderBy(field, dir = 'asc') { return { kind: 'orderBy', field, dir } }
export function query(coll, ...constraints) { return { type: 'query', path: coll.path, constraints } }

function snapOf(p) {
  const data = docs.get(p)
  return {
    id: p.split('/').pop(),
    ref: doc(null, ...p.split('/')),
    exists: () => data !== undefined,
    data: () => clone(data),
  }
}
function collDocs(q) {
  const depth = q.path.split('/').length + 1
  let list = [...docs.keys()]
    .filter((k) => k.startsWith(q.path + '/') && k.split('/').length === depth)
    .map((k) => snapOf(k))
  for (const c of q.constraints ?? []) {
    if (c.kind === 'where') {
      list = list.filter((s) => {
        const v = s.data()[c.field]
        if (c.op === '==') return v === c.value
        if (c.op === 'array-contains-any') return Array.isArray(v) && v.some((x) => c.value.includes(x))
        if (c.op === 'array-contains') return Array.isArray(v) && v.includes(c.value)
        throw new Error('op ' + c.op)
      })
    }
  }
  for (const c of [...(q.constraints ?? [])].reverse()) {
    if (c.kind === 'orderBy') {
      list.sort((a, b) => {
        const x = a.data()[c.field], y = b.data()[c.field]
        return (x > y ? 1 : x < y ? -1 : 0) * (c.dir === 'desc' ? -1 : 1)
      })
    }
  }
  return { docs: list, empty: list.length === 0, size: list.length }
}

export async function getDoc(ref) {
  calls.push(['getDoc', ref.path]); maybeFail('getDoc', ref.path)
  return snapOf(ref.path)
}
export async function getDocs(q) {
  calls.push(['getDocs', q.path, q.constraints ?? []]); maybeFail('getDocs', q.path)
  return collDocs(q)
}
function applyPatch(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && v.__op === 'increment') target[k] = (target[k] ?? 0) + v.n
    else if (v && typeof v === 'object' && v.__op === 'serverTimestamp') target[k] = Date.now()
    else target[k] = clone(v)
  }
  return target
}
function notify() { for (const l of listeners) l() }
export async function setDoc(ref, data, opts) {
  calls.push(['setDoc', ref.path, clone(data)]); maybeFail('setDoc', ref.path)
  const base = opts?.merge ? docs.get(ref.path) ?? {} : {}
  docs.set(ref.path, applyPatch(base, data)); notify()
}
export async function addDoc(coll, data) {
  maybeFail('addDoc', coll.path)
  const ref = doc(coll)
  calls.push(['addDoc', ref.path, clone(data)])
  docs.set(ref.path, applyPatch({}, data)); notify()
  return ref
}
export async function updateDoc(ref, patch) {
  calls.push(['updateDoc', ref.path, clone(patch)]); maybeFail('updateDoc', ref.path)
  if (!docs.has(ref.path)) throw err('not-found')
  docs.set(ref.path, applyPatch(docs.get(ref.path), patch)); notify()
}
export async function deleteDoc(ref) {
  calls.push(['deleteDoc', ref.path]); maybeFail('deleteDoc', ref.path)
  docs.delete(ref.path); notify()
}
export function increment(n) { return { __op: 'increment', n } }
export function serverTimestamp() { return { __op: 'serverTimestamp' } }
export const Timestamp = { now: () => ({ toMillis: () => Date.now() }) }

export function onSnapshot(target, next, onError) {
  calls.push(['onSnapshot', target.path])
  const fire = () => {
    try {
      maybeFail('onSnapshot', target.path)
      next(target.type === 'doc' ? snapOf(target.path) : collDocs(target))
    } catch (e) {
      listeners.delete(fire)
      onError?.(e)
    }
  }
  listeners.add(fire)
  fire()
  return () => listeners.delete(fire)
}

export async function runTransaction(db, fn) {
  calls.push(['runTransaction'])
  maybeFail('runTransaction', '')
  const writes = []
  const tx = {
    get: async (ref) => snapOf(ref.path),
    set: (ref, data) => { writes.push(() => docs.set(ref.path, applyPatch({}, data))); return tx },
    update: (ref, patch) => { writes.push(() => docs.set(ref.path, applyPatch(docs.get(ref.path) ?? {}, patch))); return tx },
  }
  const r = await fn(tx)
  writes.forEach((w) => w())
  notify()
  return r
}
