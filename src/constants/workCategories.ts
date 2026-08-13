import type { WorkCategoryValue } from '@/types'

export interface WorkCategoryOption {
  value: WorkCategoryValue
  label: string
}

export const WORK_CATEGORIES: WorkCategoryOption[] = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'tiler', label: 'Tiler' },
  { value: 'painter', label: 'Painter' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'mason', label: 'Mason' },
  { value: 'ac_technician', label: 'AC Technician' },
  { value: 'welder', label: 'Welder' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'interior_designer', label: 'Interior Designer' },
]

export function labelForCategory(value: WorkCategoryValue): string {
  return WORK_CATEGORIES.find((c) => c.value === value)?.label ?? value
}
