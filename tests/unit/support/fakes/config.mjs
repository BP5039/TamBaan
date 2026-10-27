import { auth as fakeAuth } from './firebase-auth.mjs'
export const app = { name: '[DEFAULT]' }
export const auth = fakeAuth
export const db = { type: 'firestore' }
export const storage = { type: 'storage' }
