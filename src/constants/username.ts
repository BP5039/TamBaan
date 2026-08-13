export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function baseUsernameFrom(firstName: string, lastName: string): string {
  const first = slugify(firstName)
  const lastInitial = slugify(lastName).slice(0, 1)
  const base = lastInitial ? `${first}-${lastInitial}` : first
  return base || 'user'
}