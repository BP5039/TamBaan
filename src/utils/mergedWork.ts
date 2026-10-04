import { computed, type ComputedRef } from 'vue'
import type { PortfolioItem } from '@/types'
import type { Project } from '@/types/project'

export type MergedWorkEntry =
  | { type: 'manual'; key: string; year: number; item: PortfolioItem }
  | { type: 'project'; key: string; year: number; project: Project }

const STATUS_TIER: Record<string, number> = { active: 0, completed: 1, pending: 2 }

function tier(entry: MergedWorkEntry): number {
  return entry.type === 'manual' ? 3 : (STATUS_TIER[entry.project.status] ?? 3)
}

function lastUpdate(entry: MergedWorkEntry): number {
  return entry.type === 'manual' ? entry.item.createdAt : entry.project.updatedAt
}

/**
 * Groups a user's own projects (every status) and manual past-work entries
 * into one by-year feed, active-first within a year. Shared by the private
 * dashboard (ProfileView) and the My Projects nav page (MyProjectsView) so
 * the two can't drift out of sync the way they did before.
 *
 * Not used by PublicProfileView — that page filters to completed projects
 * only before this point, so there's no status to tier, and it sorts with
 * its own simpler comparator.
 */
export function useMergedWork(
  manualItems: ComputedRef<PortfolioItem[]>,
  projects: ComputedRef<Project[]>,
) {
  return computed(() => {
    const entries: MergedWorkEntry[] = [
      ...manualItems.value.map((item): MergedWorkEntry => ({
        type: 'manual',
        key: `manual-${item.id}`,
        year: item.year,
        item,
      })),
      ...projects.value.map((project): MergedWorkEntry => ({
        type: 'project',
        key: `project-${project.id}`,
        year: project.plannedStartDate
          ? new Date(project.plannedStartDate).getFullYear()
          : new Date().getFullYear(),
        project,
      })),
    ]

    const map = new Map<number, MergedWorkEntry[]>()
    for (const entry of entries) {
      if (!map.has(entry.year)) map.set(entry.year, [])
      map.get(entry.year)!.push(entry)
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({
        year,
        items: [...items].sort((a, b) => {
          const diff = tier(a) - tier(b)
          if (diff !== 0) return diff
          return lastUpdate(b) - lastUpdate(a)
        }),
      }))
  })
}