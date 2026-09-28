export interface GalleryPhoto {
  thumb: string
  full: string
  taskId: string | null // null = project reference photo, not tied to any one task
  sourceLabel: string
  sortAt: number
}

export interface GalleryAlbum {
  key: string
  label: string
  photos: GalleryPhoto[] // always oldest → newest, regardless of sort
  latestAt: number
}

/**
 * Groups a flat photo list into one album per task (plus one for project
 * reference photos), sorted by each album's most recent photo.
 *
 * Pure function: no store access, so it can be unit tested directly.
 */
export function buildGalleryAlbums(
  photos: GalleryPhoto[],
  sort: 'newest' | 'oldest',
): GalleryAlbum[] {
  const groups = new Map<string, GalleryPhoto[]>()
  for (const p of photos) {
    const key = p.taskId ?? 'project'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const albums: GalleryAlbum[] = [...groups.entries()].map(([key, groupPhotos]) => {
    const chronological = [...groupPhotos].sort((a, b) => a.sortAt - b.sortAt)
    return {
      key,
      label: chronological[0].sourceLabel,
      photos: chronological,
      latestAt: Math.max(...groupPhotos.map((p) => p.sortAt)),
    }
  })

  const sorted = albums.sort((a, b) => a.latestAt - b.latestAt)
  return sort === 'newest' ? sorted.reverse() : sorted
}