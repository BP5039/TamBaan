import { defineStore } from 'pinia'
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { parseSearchQuery } from '@/utils/searchParse'
import type { UserProfile, WorkCategoryValue } from '@/types'

export type SortOption = 'newest' | 'oldest' | 'mostWork' | 'leastWork' | 'highestRated'

interface DiscoveryState {
  results: UserProfile[]
  loading: boolean
  error: string
  searchQuery: string
  selectedCategories: WorkCategoryValue[]
  selectedProvince: string | null
  sortOption: SortOption
}

export const useDiscoveryStore = defineStore('discovery', {
  state: (): DiscoveryState => ({
    results: [],
    loading: false,
    error: '',
    searchQuery: '',
    selectedCategories: [],
    selectedProvince: null,
    sortOption: 'newest',
  }),

  getters: {
    filteredResults(state): UserProfile[] {
      const q = state.searchQuery.trim().toLowerCase()
      if (!q) return state.results
      return state.results.filter((p) => {
        const nameMatch = `${p.firstName} ${p.lastName} ${p.username}`.toLowerCase().includes(q)
        const workMatch = (p.portfolioPreview ?? []).some((item) =>
          `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(q),
        )
        return nameMatch || workMatch
      })
    },

    sortedResults(state): UserProfile[] {
      const list = [...this.filteredResults]
      switch (state.sortOption) {
        case 'newest':
          return list.sort((a, b) => b.createdAt - a.createdAt)
        case 'oldest':
          return list.sort((a, b) => a.createdAt - b.createdAt)
        case 'mostWork':
          return list.sort((a, b) => (b.portfolioCount ?? 0) - (a.portfolioCount ?? 0))
        case 'leastWork':
          return list.sort((a, b) => (a.portfolioCount ?? 0) - (b.portfolioCount ?? 0))
        case 'highestRated':
          return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        default:
          return list
      }
    },
  },

  actions: {
    setSortOption(value: SortOption) {
      this.sortOption = value
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