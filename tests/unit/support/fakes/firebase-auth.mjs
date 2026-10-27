// In-memory Firebase Auth stand-in.
const users = new Map() // email -> { uid, email, password, emailVerified }
const codes = new Map() // oobCode -> { email, operation, used }
let stateCb = null
let uidSeq = 0
const failures = []
export const sent = { verification: [], reset: [] }

function err(code) { const e = new Error(code); e.code = code; e.name = 'FirebaseError'; return e }
function maybeFail(op) {
  const i = failures.findIndex((f) => f.op === op)
  if (i >= 0) { const f = failures.splice(i, 1)[0]; throw err(f.code) }
}
function userObj(u) {
  return { uid: u.uid, email: u.email, emailVerified: u.emailVerified }
}

export const auth = { currentUser: null }
export const fa = {
  reset() {
    users.clear(); codes.clear(); stateCb = null; uidSeq = 0; failures.length = 0
    auth.currentUser = null; sent.verification.length = 0; sent.reset.length = 0
  },
  addUser(email, password, opts = {}) {
    const u = { uid: opts.uid ?? 'uid-' + ++uidSeq, email, password, emailVerified: !!opts.emailVerified }
    users.set(email, u); return userObj(u)
  },
  user(email) { return users.get(email) },
  signInAs(email) { const u = users.get(email); auth.currentUser = userObj(u); return auth.currentUser },
  addCode(code, email, operation) { codes.set(code, { email, operation, used: false }) },
  fail(op, code) { failures.push({ op, code }) },
  emitState(user) { auth.currentUser = user; return stateCb?.(user) },
  sent,
}

export function getAuth() { return auth }
export function onAuthStateChanged(a, cb) { stateCb = cb; return () => { stateCb = null } }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export async function createUserWithEmailAndPassword(a, email, password) {
  maybeFail('createUser')
  if (!EMAIL_RE.test(email)) throw err('auth/invalid-email')
  if (users.has(email)) throw err('auth/email-already-in-use')
  if (password.length < 6) throw err('auth/weak-password')
  const u = fa.addUser(email, password)
  auth.currentUser = u
  return { user: u }
}
export async function signInWithEmailAndPassword(a, email, password) {
  maybeFail('signIn')
  if (!EMAIL_RE.test(email)) throw err('auth/invalid-email')
  const u = users.get(email)
  if (!u || u.password !== password) throw err('auth/invalid-credential')
  auth.currentUser = userObj(u)
  return { user: auth.currentUser }
}
export async function signOut() { maybeFail('signOut'); auth.currentUser = null }
export async function reload(user) {
  maybeFail('reload')
  const u = [...users.values()].find((x) => x.uid === user.uid)
  if (u) { user.emailVerified = u.emailVerified }
}
export async function sendEmailVerification(user, settings) {
  maybeFail('sendEmailVerification')
  sent.verification.push({ email: user.email, settings })
}
export async function sendPasswordResetEmail(a, email, settings) {
  maybeFail('sendPasswordResetEmail')
  if (!EMAIL_RE.test(email)) throw err('auth/invalid-email')
  // Email-enumeration protection: unknown emails succeed silently.
  sent.reset.push({ email, settings })
}
function useCode(code, operation) {
  const c = codes.get(code)
  if (!c || c.used || c.operation !== operation) throw err('auth/invalid-action-code')
  return c
}
export async function verifyPasswordResetCode(a, code) { maybeFail('verifyPasswordResetCode'); return useCode(code, 'PASSWORD_RESET').email }
export async function confirmPasswordReset(a, code, newPassword) {
  maybeFail('confirmPasswordReset')
  const c = useCode(code, 'PASSWORD_RESET'); c.used = true
  users.get(c.email).password = newPassword
}
export async function checkActionCode(a, code) {
  maybeFail('checkActionCode')
  const c = useCode(code, 'VERIFY_EMAIL')
  return { data: { email: c.email }, operation: c.operation }
}
export async function applyActionCode(a, code) {
  maybeFail('applyActionCode')
  const c = useCode(code, 'VERIFY_EMAIL'); c.used = true
  users.get(c.email).emailVerified = true
}
export const EmailAuthProvider = { credential: (email, password) => ({ email, password }) }
export async function reauthenticateWithCredential(user, cred) {
  maybeFail('reauthenticate')
  const u = users.get(cred.email)
  if (!u || u.password !== cred.password) throw err('auth/invalid-credential')
  return { user }
}
export async function updatePassword(user, pw) {
  maybeFail('updatePassword')
  users.get(user.email).password = pw
}
