// Shared fixtures: reset all fakes and seed the locked test accounts.
import { fs } from './fakes/firebase-firestore.mjs'
import { fa, auth, sent } from './fakes/firebase-auth.mjs'
import { st } from './fakes/firebase-storage.mjs'
import { routerState } from './fakes/vue-router.mjs'
import { heicState } from './fakes/heic2any.mjs'
import { freshPinia } from './pinia.mjs'
export { fs, fa, auth, sent, st, routerState, heicState }

export const T0 = new Date(2026, 9, 27, 9, 0, 0).getTime() // 27 Oct 2026 09:00 local
export const DAY = 24 * 60 * 60 * 1000

export const SIRIPORN = {
  uid: 'uid-siriporn', firstName: 'Siriporn', lastName: 'Kaewkla', phone: '0812345678',
  username: 'siriporn-k', lineId: 'siriporn.k', facebookId: 'Siriporn Kaewkla', province: 'Chiang Mai',
  role: 'homeowner', workCategories: [], photoURL: null, createdAt: T0 - 30 * DAY, updatedAt: T0 - 30 * DAY,
}
export const ANUWAT = {
  uid: 'uid-anuwat', firstName: 'Anuwat', lastName: 'Prommanee', phone: '0898765432',
  username: 'anuwat-p', lineId: 'anuwat.p', facebookId: 'Anuwat Prommanee', province: 'Chiang Mai',
  role: 'professional', workCategories: ['contractor', 'painter'], photoURL: null,
  rating: null, ratingCount: 0, portfolioPreview: [], portfolioCount: 0,
  lastActiveAt: T0 - 2 * 60 * 60 * 1000, createdAt: T0 - 29 * DAY, updatedAt: T0 - 29 * DAY,
}
export const PRASERT = {
  uid: 'uid-prasert', firstName: 'Prasert', lastName: 'Wongsuwan', phone: '0851234567',
  username: 'prasert-w', lineId: 'prasert.w', facebookId: 'Prasert Wongsuwan', province: 'Lamphun',
  role: 'professional', workCategories: ['electrician', 'plumber'], photoURL: null,
  rating: null, ratingCount: 0, portfolioPreview: [], portfolioCount: 0,
  lastActiveAt: T0 - 40 * DAY, createdAt: T0 - 5 * DAY, updatedAt: T0 - 5 * DAY,
}
export const KANOKWAN = {
  uid: 'uid-kanokwan', firstName: 'Kanokwan', lastName: 'Srisuk', phone: '0861234567',
  username: 'kanokwan-s', lineId: 'kanokwan.s', facebookId: 'Kanokwan Srisuk', province: 'Chiang Mai',
  role: 'homeowner', workCategories: [], photoURL: null, createdAt: T0 - 2 * DAY, updatedAt: T0 - 2 * DAY,
}
export const PW = 'TamBaan88'
const EMAIL = { [SIRIPORN.uid]: 'bhupha.p+home1@gmail.com', [ANUWAT.uid]: 'bhupha.p+pro1@gmail.com', [PRASERT.uid]: 'bhupha.p+pro2@gmail.com', [KANOKWAN.uid]: 'bhupha.p+home2@gmail.com' }
export const emailOf = (p) => EMAIL[p.uid]

export function reset({ seed = true } = {}) {
  fs.reset(); fa.reset(); st.reset(); routerState.reset()
  heicState.mode = 'ok'; heicState.size = 1000; heicState.calls = 0
  freshPinia()
  if (seed) {
    for (const p of [SIRIPORN, ANUWAT, PRASERT, KANOKWAN]) {
      fa.addUser(EMAIL[p.uid], PW, { uid: p.uid, emailVerified: true })
      fs.set(`users/${p.uid}`, p)
      fs.set(`usernames/${p.username}`, { uid: p.uid, createdAt: p.createdAt })
    }
  }
}

/** Log in through the real auth store so state matches the app. */
export async function loginAs(profile) {
  const { useAuthStore } = await import('@/stores/auth')
  const a = useAuthStore()
  await a.login(EMAIL[profile.uid], PW)
  return a
}

// Projects seeded in Firestore (shape of src/types/project.ts)
export function projectDoc(over = {}) {
  return {
    name: 'Townhouse renovation', projectType: 'renovation',
    description: 'Repaint the living room and retile the kitchen floor.', location: 'Chiang Mai',
    plannedStartDate: '2026-11-02', plannedEndDate: '2026-11-30', status: 'pending',
    homeownerUid: SIRIPORN.uid, homeownerName: 'Siriporn Kaewkla', homeownerUsername: 'siriporn-k',
    contractorUid: null, contractorName: null, contractorUsername: null,
    pendingInvitationUid: null, pendingInvitationName: null, pendingInvitationUsername: null,
    invitationExpiresAt: null, lastVerifiedPhotoUrl: null, referenceImages: [], review: null,
    unreadCountHomeowner: 0, unreadCountContractor: 0, photoCount: 0,
    createdAt: T0 - DAY, updatedAt: T0 - DAY, ...over,
  }
}
export function activeProject(over = {}) {
  return projectDoc({ status: 'active', contractorUid: ANUWAT.uid, contractorName: 'Anuwat Prommanee', contractorUsername: 'anuwat-p', ...over })
}
export function seedProject(id, data) { fs.set(`projects/${id}`, data); return { id, ...data } }
export function taskDoc(over = {}) {
  return { title: 'Repaint living room walls', description: 'Two coats, cream white, Beger WeatherGuard', status: 'not_started', hasProgress: false, referenceImages: [], createdAt: T0 - DAY, updatedAt: T0 - DAY, ...over }
}
export function updateDoc_(over = {}) {
  return { taskId: 't1', taskTitle: 'Repaint living room walls', images: [{ thumb: 'https://storage.test/progress/p1/a-thumb.jpg', full: 'https://storage.test/progress/p1/a-full.jpg' }], description: 'First coat done.', status: 'pending', sentBackReason: null, exifTimestamp: null, exifDevice: null, lastReminderAt: null, createdAt: T0, updatedAt: T0, ...over }
}

// Files
export function file(name, type, size = 1000) { return new File([new Uint8Array(size)], name, { type }) }
export const MB = 1024 * 1024
