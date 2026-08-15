import { WORK_CATEGORIES } from '@/constants/workCategories'
import { THAI_PROVINCES } from '@/constants/provinces'
import type { WorkCategoryValue } from '@/types'

export interface ParsedSearch {
  categories: WorkCategoryValue[]
  province: string | null
}

/** Classic edit-distance — how many single-character changes turn a into b. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/** How many typos we tolerate scales with word length — short words stay strict. */
function maxAllowedDistance(len: number): number {
  if (len <= 3) return 0
  if (len <= 6) return 1
  return 2
}

function normalizeCompact(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

/** Category words are safe to match individually — no two categories share a word. */
function findMatchingCategories(words: string[]): WorkCategoryValue[] {
  const matched = new Set<WorkCategoryValue>()

  for (const rawWord of words) {
    const word = rawWord.toLowerCase().replace(/[^a-z]/g, '')
    if (word.length < 3) continue // skip noise words like "in", "at"

    for (const cat of WORK_CATEGORIES) {
      const labelWords = cat.label.toLowerCase().split(/\s+/)
      for (const labelWord of labelWords) {
        if (labelWord.includes(word) || word.includes(labelWord)) {
          matched.add(cat.value)
          continue
        }
        const dist = levenshtein(word, labelWord)
        if (dist <= maxAllowedDistance(Math.max(word.length, labelWord.length))) {
          matched.add(cat.value)
        }
      }
    }
  }

  return Array.from(matched)
}

/**
 * Provinces are matched as a whole phrase, not word-by-word — many share a
 * first word (Nakhon Pathom, Nakhon Sawan, Nakhon Si Thammarat...), so
 * word-level matching would false-positive constantly. Instead we slide a
 * 1-to-3-word window across the query and compare each window, compacted,
 * against each province's compacted name.
 */
function findBestProvinceMatch(words: string[]): string | null {
  let best: { province: string; distance: number } | null = null

  for (let windowSize = 1; windowSize <= 3; windowSize++) {
    for (let i = 0; i + windowSize <= words.length; i++) {
      const windowText = normalizeCompact(words.slice(i, i + windowSize).join(''))
      if (windowText.length < 3) continue

      for (const province of THAI_PROVINCES) {
        const provinceCompact = normalizeCompact(province)
        const dist = levenshtein(windowText, provinceCompact)
        const allowed = maxAllowedDistance(Math.max(windowText.length, provinceCompact.length))
        if (dist <= allowed && (!best || dist < best.distance)) {
          best = { province, distance: dist }
        }
      }
    }
  }

  return best ? best.province : null
}

export function parseSearchQuery(raw: string): ParsedSearch {
  const words = raw.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { categories: [], province: null }

  return {
    categories: findMatchingCategories(words),
    province: findBestProvinceMatch(words),
  }
}