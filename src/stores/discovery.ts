import { defineStore } from 'pinia'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { UserProfile, WorkCategoryValue } from '@/types'

interface DiscoveryState {
  results: UserProfile[]
  loading: boolean
  error: string
}

export const useDiscoveryStore = defineStore('discovery', {
  state: (): DiscoveryState => ({
    results: [],
    loading: false,
    error: '',
  }),

  actions: {
    async search(filters: { categories: WorkCategoryValue[]; province: string | null }) {
      this.loading = true
      this.error = ''
      try {
        const constraints = [where('role', '==', 'professional')]
        if (filters.province) {
          constraints.push(where('province', '==', filters.province))
        }
        if (filters.categories.length > 0) {
          constraints.push(
            where('workCategories', 'array-contains-any', filters.categories.slice(0, 10)),
          )
        }
        const q = query(collection(db, 'users'), ...constraints)
        const snap = await getDocs(q)
        this.results = snap.docs.map((d) => d.data() as UserProfile)
      } catch (err) {
        console.error('discovery search failed:', err)
        this.error =
          'Search failed. If this is the first search with these filters, check the console for a Firestore index link.'
      } finally {
        this.loading = false
      }
    },
  },
})