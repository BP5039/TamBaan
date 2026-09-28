import type { ProjectTask, ProgressUpdate, SnapshotTaskState, TaskStatus } from '@/types/project'

/**
 * Reconstructs the full board state (status + the specific update that was
 * live) as of any past moment — powers the Snapshot modal's "git history"
 * view when an Activity entry is clicked.
 *
 * Pure function: takes the task/update lists explicitly rather than reading
 * from a store, so it can be unit tested in isolation.
 */
export function snapshotAt(
  tasks: ProjectTask[],
  updates: ProgressUpdate[],
  timestamp: number,
): SnapshotTaskState[] {
  return tasks
    // A task created after this moment didn't exist yet — it has no place
    // in a snapshot of the past.
    .filter((task) => task.createdAt <= timestamp)
    .map((task) => {
      const updatesByThen = updates
        .filter((u) => u.taskId === task.id && u.createdAt <= timestamp)
        .sort((a, b) => b.createdAt - a.createdAt)

      if (!updatesByThen.length) {
        return { task, status: 'not_started' as TaskStatus, update: null }
      }

      const latest = updatesByThen[0]
      // The update exists by `timestamp`, but its review (verified/sent back)
      // may not have happened yet — in that case it was still awaiting review.
      if (latest.status === 'pending' || latest.updatedAt > timestamp) {
        return { task, status: 'awaiting_review' as TaskStatus, update: latest }
      }
      if (latest.status === 'verified') {
        return { task, status: 'done' as TaskStatus, update: latest }
      }
      return { task, status: 'sent_back' as TaskStatus, update: latest }
    })
}