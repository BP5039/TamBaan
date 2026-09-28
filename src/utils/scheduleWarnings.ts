import { DAYS_PER_TASK } from '@/constants/projectTypes'
import type { Project, ProjectTask } from '@/types/project'

export type ScheduleWarning = 'delayed' | 'at_risk' | null

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Determines whether an active project should show the "Delayed" or
 * "At risk" tag, given its planned end date, scope, and remaining tasks.
 * "Delayed" is the harder signal (the deadline has actually passed) and
 * always takes priority over "At risk" (a softer, earlier prediction).
 *
 * Pure function: takes project/tasks/now explicitly rather than reading
 * reactive refs, so it can be unit tested directly.
 */
export function getScheduleWarning(
  project: Pick<Project, 'status' | 'plannedEndDate' | 'projectType'> | null,
  tasks: Pick<ProjectTask, 'status'>[],
  now: number,
): ScheduleWarning {
  if (!project || project.status !== 'active') return null

  const allTasksDone = tasks.length > 0 && tasks.every((t) => t.status === 'done')
  const deadline = new Date(project.plannedEndDate).getTime()

  if (deadline < now && !allTasksDone) return 'delayed'
  if (allTasksDone) return null

  const remainingTasks = tasks.filter((t) => t.status !== 'done').length
  if (remainingTasks === 0) return null

  const expectedDaysNeeded = remainingTasks * DAYS_PER_TASK[project.projectType]
  const daysRemaining = (deadline - now) / DAY_MS
  return daysRemaining > 0 && expectedDaysNeeded > daysRemaining ? 'at_risk' : null
}