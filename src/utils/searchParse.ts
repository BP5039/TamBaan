import { WORK_CATEGORIES } from '@/constants/workCategories'
import { THAI_PROVINCES } from '@/constants/provinces'
import type { WorkCategoryValue } from '@/types'

export interface ParsedSearch {
  categories: WorkCategoryValue[]
  province: string | null
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Detects known category labels and province names inside free text. */
export function parseSearchQuery(raw: string): ParsedSearch {
  const text = normalize(raw)
  const categories: WorkCategoryValue[] = []

  for (const cat of WORK_CATEGORIES) {
    if (text.includes(normalize(cat.label))) {
      categories.push(cat.value)
    }
  }

  let province: string | null = null
  for (const p of THAI_PROVINCES) {
    const withSpace = normalize(p)
    const noSpace = withSpace.replace(/ /g, '')
    if (text.includes(withSpace) || text.replace(/ /g, '').includes(noSpace)) {
      province = p
      break
    }
  }

  return { categories, province }
}