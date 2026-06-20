import type { UsageMetric } from '@shared/types'
import { pct, countdown } from '../lib/format'

function color(p: number, amber: number, red: number): string {
  if (p >= red) return 'text-rose-500'
  if (p >= amber) return 'text-amber-500'
  return 'text-emerald-500'
}

export function UsageMeter({
  label,
  m,
  amber,
  red
}: {
  label: string
  m: UsageMetric
  amber: number
  red: number
}) {
  const c = color(m.usedPct, amber, red)
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(1, m.usedPct / 100)
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72" className={c}>
        <circle
          cx="36"
          cy="36"
          r={r}
          className="stroke-black/10 dark:stroke-white/10"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          strokeWidth="6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={dash + ' ' + circ}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div>
        <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{pct(m.usedPct)}</div>
        <div className="text-xs opacity-60">resets in {countdown(m.resetsAt)}</div>
      </div>
    </div>
  )
}
