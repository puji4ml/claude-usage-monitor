export function pct(n: number): string {
  return Math.round(n) + '%'
}

export function countdown(resetsAt: string, now: Date = new Date()): string {
  const ms = new Date(resetsAt).getTime() - now.getTime()
  if (!isFinite(ms) || ms <= 0) return 'resetting…'
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm'
}

// Within a day: "in 2h 58m". Further out: weekday + time, e.g. "Thu 5:00 PM".
export function resetLabel(resetsAt: string, now: Date = new Date()): string {
  const t = new Date(resetsAt).getTime()
  if (!isFinite(t)) return ''
  const ms = t - now.getTime()
  if (ms <= 0) return 'resetting now'
  if (ms < 24 * 60 * 60 * 1000) return 'in ' + countdown(resetsAt, now)
  const d = new Date(t)
  const wd = d.toLocaleDateString(undefined, { weekday: 'short' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return wd + ' ' + time
}
