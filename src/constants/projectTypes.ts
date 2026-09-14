import type { ProjectType } from '@/types/project'

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'quick_fix', label: 'Quick fix' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'new_build', label: 'New build' },
]

export function labelForProjectType(type: ProjectType): string {
  return PROJECT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

/**
 * Rough expected days needed per remaining task, by project type. This is
 * deliberately a coarse heuristic, not a real schedule estimator — a "Quick
 * fix" with many small tasks still paces faster than a "New build" with the
 * same task count, which is exactly the ambiguity a flat day/task-count
 * calculation couldn't resolve on its own.
 */
export const DAYS_PER_TASK: Record<ProjectType, number> = {
  quick_fix: 0.5,
  renovation: 1.5,
  new_build: 3,
}