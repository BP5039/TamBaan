export function getYearOptions(yearsBack = 20): string[] {
  const current = new Date().getFullYear()
  return Array.from({ length: yearsBack + 1 }, (_, i) => String(current - i))
}