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
