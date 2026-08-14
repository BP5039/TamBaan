import { defineStore } from 'pinia'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { UserProfile } from '@/types'

interface PublicProfileState {
  profile: UserProfile | null
  loading: boolean
  notFound: boolean
}

export const usePublicProfileStore = defineStore('publicProfile', {
  state: (): PublicProfileState => ({
    profile: null,
    loading: false,
    notFound: false,
  }),

  actions: {
    async loadByUsername(username: string) {
      this.loading = true
      this.notFound = false
      this.profile = null
      try {
        const usernameSnap = await getDoc(doc(db, 'usernames', username))
        if (!usernameSnap.exists()) {
          this.notFound = true
          return
        }
        const { uid } = usernameSnap.data() as { uid: string }
        const profileSnap = await getDoc(doc(db, 'users', uid))
        if (!profileSnap.exists()) {
          this.notFound = true
          return
        }
        this.profile = profileSnap.data() as UserProfile
      } catch (err) {
        console.error('loadByUsername failed:', err)
        this.notFound = true
      } finally {
        this.loading = false
      }
    },
  },
})