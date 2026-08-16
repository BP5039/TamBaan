export function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return 'Activity unknown'

  const diffMs = Date.now() - timestamp
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return 'Active today'
  if (diffDays < 7) return 'Active this week'
  if (diffDays < 30) return `Active ${diffDays} days ago`
  return 'Active over a month ago'
}