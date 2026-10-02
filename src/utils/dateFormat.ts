const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short' })

// 'YYYY-MM-DD' -> a local Date. Parsing with the time component pinned to
// midnight local time (instead of letting `new Date('YYYY-MM-DD')` parse it
// as UTC) keeps the displayed day from shifting in timezones behind UTC.
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// "2026-09-06" + "2026-09-20" -> "Sep 6 – 20, 2026"
// "2026-09-06" + "2026-10-02" -> "Sep 6 – Oct 2, 2026"
// "2026-12-28" + "2027-01-04" -> "Dec 28, 2026 – Jan 4, 2027"
export function formatDateRange(startValue: string, endValue: string): string {
  if (!startValue || !endValue) return ''

  const start = parseDateOnly(startValue)
  const end = parseDateOnly(endValue)

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${MONTH_FORMAT.format(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
  }
  if (sameYear) {
    return `${MONTH_FORMAT.format(start)} ${start.getDate()} – ${MONTH_FORMAT.format(end)} ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${MONTH_FORMAT.format(start)} ${start.getDate()}, ${start.getFullYear()} – ${MONTH_FORMAT.format(end)} ${end.getDate()}, ${end.getFullYear()}`
}