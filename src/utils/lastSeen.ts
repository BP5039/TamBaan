export function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return 'Activity unknown'

  const diffDays = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return 'Active today'
  if (diffDays < 2) return 'Active yesterday'
  if (diffDays < 7) return 'Active this week'
  if (diffDays < 30) return `Active ${diffDays} days ago`
  return 'Active over a month ago'
}

export type ActivityTier = 'recent' | 'moderate' | 'inactive'

export function getActivityTier(timestamp?: number): ActivityTier {
  if (!timestamp) return 'inactive'
  const diffDays = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
  if (diffDays < 2) return 'recent'
  if (diffDays < 30) return 'moderate'
  return 'inactive'
}

export function activityRingClass(timestamp?: number): string {
  const tier = getActivityTier(timestamp)
  if (tier === 'recent') return 'border-success'
  if (tier === 'moderate') return 'border-wood'
  return 'border-sand'
}

export function activityTextClass(timestamp?: number): string {
  const tier = getActivityTier(timestamp)
  if (tier === 'recent') return 'text-success-text'
  if (tier === 'moderate') return 'text-wood-text'
  return 'text-muted'
}