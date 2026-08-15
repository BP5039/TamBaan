import { defineStore } from 'pinia'
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { parseSearchQuery } from '@/utils/searchParse'
import type { UserProfile, WorkCategoryValue } from '@/types'

interface DiscoveryState {
  results: UserProfile[]
  loading: boolean
  error: string
  searchQuery: string
  selectedCategories: WorkCategoryValue[]
  selectedProvince: string | null
}

export const useDiscoveryStore = defineStore('discovery', {
  state: (): DiscoveryState => ({
    results: [],
    loading: false,
    error: '',
    searchQuery: '',
    selectedCategories: [],
    selectedProvince: null,
  }),

  getters: {
    filteredResults(state): UserProfile[] {
      const q = state.searchQuery.trim().toLowerCase()
      if (!q) return state.results
      return state.results.filter((p) => {
        const haystack =
          `${p.firstName} ${p.lastName} ${p.username} ${p.portfolioSearchText ?? ''}`.toLowerCase()
        return haystack.includes(q)
      })
    },
  },

  actions: {
    setSearchQuery(value: string) {
      this.searchQuery = value
    },

    toggleCategory(value: WorkCategoryValue) {
      const set = new Set(this.selectedCategories)
      set.has(value) ? set.delete(value) : set.add(value)
      this.selectedCategories = Array.from(set)
      this.runSearch()
    },

    setProvince(value: string | null) {
      this.selectedProvince = value
      this.runSearch()
    },

    /**
     * On submit: parse free text for category/province matches and apply
     * them as real filters. If anything was found, the raw text is cleared
     * afterward — otherwise it would also be required as a literal
     * substring match on name/username/portfolio text, which cancels out
     * the filter that was just correctly applied.
     */
    submitSearch(rawQuery: string) {
      const parsed = parseSearchQuery(rawQuery)
      let filterApplied = false

      if (parsed.categories.length > 0) {
        const set = new Set(this.selectedCategories)
        parsed.categories.forEach((c) => set.add(c))
        this.selectedCategories = Array.from(set)
        filterApplied = true
      }
      if (parsed.province) {
        this.selectedProvince = parsed.province
        filterApplied = true
      }

      this.searchQuery = filterApplied ? '' : rawQuery
      this.runSearch()
    },

    async runSearch() {
      this.loading = true
      this.error = ''
      try {
        const constraints = [where('role', '==', 'professional')]
        if (this.selectedProvince) {
          constraints.push(where('province', '==', this.selectedProvince))
        }
        if (this.selectedCategories.length > 0) {
          constraints.push(
            where('workCategories', 'array-contains-any', this.selectedCategories.slice(0, 10)),
          )
        }
        const q = firestoreQuery(collection(db, 'users'), ...constraints)
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