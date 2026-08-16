import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '@/firebase/config'
import type { ProfileFormData, UserProfile } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  initialized: boolean
  loading: boolean
}

let readyResolve: () => void
const readyPromise = new Promise<void>((resolve) => {
  readyResolve = resolve
})

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    profile: null,
    initialized: false,
    loading: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    hasProfile: (state) => !!state.profile,
  },

  actions: {
    init() {
      onAuthStateChanged(auth, async (firebaseUser) => {
        this.user = firebaseUser
        if (firebaseUser) {
          await this.fetchProfile(firebaseUser.uid)
          // Fire-and-forget — don't block app load on this, and don't fail loudly
          // if it errors, since it's a nice-to-have signal, not core functionality.
          updateDoc(doc(db, 'users', firebaseUser.uid), { lastActiveAt: Date.now() }).catch((err) =>
            console.error('Failed to update lastActiveAt:', err),
          )
        } else {
          this.profile = null
        }
        if (!this.initialized) {
          this.initialized = true
          readyResolve()
        }
      })
      return readyPromise
    },

    whenReady() {
      return readyPromise
    },

    async register(email: string, password: string) {
      this.loading = true
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        this.user = cred.user
        return cred.user
      } finally {
        this.loading = false
      }
    },

    async login(email: string, password: string) {
      this.loading = true
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        this.user = cred.user
        await this.fetchProfile(cred.user.uid)
        return cred.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      await signOut(auth)
      this.user = null
      this.profile = null
    },

    async fetchProfile(uid: string) {
      const snap = await getDoc(doc(db, 'users', uid))
      this.profile = snap.exists() ? (snap.data() as UserProfile) : null
    },

    /** Edit-mode save only — never touches the username reservation. */
    async saveProfile(data: ProfileFormData) {
      if (!this.user) throw new Error('Not authenticated')
      const ref = doc(db, 'users', this.user.uid)
      const existing = await getDoc(ref)

      const payload = {
        uid: this.user.uid,
        ...data,
        updatedAt: Date.now(),
        ...(existing.exists() ? {} : { createdAt: Date.now() }),
      }

      await setDoc(ref, payload, { merge: true })
      await this.fetchProfile(this.user.uid)
    },

    async uploadAvatar(file: File) {
      if (!this.user) throw new Error('Not authenticated')
      const path = `avatars/${this.user.uid}/${Date.now()}-${file.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)

      await updateDoc(doc(db, 'users', this.user.uid), {
        photoURL: url,
        updatedAt: Date.now(),
      })
      if (this.profile) this.profile.photoURL = url
      return url
    },

    async isUsernameAvailable(username: string) {
      const snap = await getDoc(doc(db, 'usernames', username))
      return !snap.exists()
    },

    async suggestUsernames(base: string, count = 4) {
      const suggestions: string[] = []
      let n = 1
      while (suggestions.length < count && n <= 50) {
        const candidate = `${base}-${n}`
        // eslint-disable-next-line no-await-in-loop
        if (await this.isUsernameAvailable(candidate)) suggestions.push(candidate)
        n++
      }
      return suggestions
    },

    /**
     * Onboarding-only. Reserves the username and creates the profile
     * document in a single transaction, so two people can't claim the
     * same handle in a race. Throws Error('username-taken') if it lost.
     */
    async createProfileWithUsername(data: ProfileFormData) {
      if (!this.user) throw new Error('Not authenticated')
      const uid = this.user.uid
      const usernameRef = doc(db, 'usernames', data.username)
      const profileRef = doc(db, 'users', uid)

      await runTransaction(db, async (tx) => {
        const usernameSnap = await tx.get(usernameRef)
        if (usernameSnap.exists()) {
          throw new Error('username-taken')
        }
        tx.set(usernameRef, { uid, createdAt: Date.now() })
        tx.set(profileRef, {
          uid,
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      await this.fetchProfile(uid)
    },
  },
})

export { serverTimestamp, Timestamp }