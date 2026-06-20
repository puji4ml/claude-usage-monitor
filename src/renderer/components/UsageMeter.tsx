import type { UsageMetric } from '@shared/types'
import { pct, resetLabel } from '../lib/format'

type Tone = { ring: string; glow: string; text: string }

function tone(p: number, amber: number, red: number): Tone {
  if (p >= red) return { ring: '#fb7185', glow: 'rgba(251,113,133,0.55)', text: 'text-rose-300' }
  if (p >= amber) return { ring: '#fbbf24', glow: 'rgba(251,191,36,0.5)', text: 'text-amber-300' }
  return { ring: '#34d399', glow: 'rgba(52,211,153,0.45)', text: 'text-emerald-300' }
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
  const t = tone(m.usedPct, amber, red)
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(1, Math.max(0, m.usedPct / 100))

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
        <circle cx="34" cy="34" r={r} stroke="rgba(255,255,255,0.10)" strokeWidth="6" fill="none" />
        <circle
          cx="34"
          cy="34"
          r={r}
          stroke={t.ring}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={dash + ' ' + circ}
          transform="rotate(-90 34 34)"
          style={{ filter: 'drop-shadow(0 0 6px ' + t.glow + ')' }}
        />
      </svg>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">{label}</div>
        <div className={'text-2xl font-semibold tabular-nums ' + t.text}>{pct(m.usedPct)}</div>
        <div className="truncate text-xs text-zinc-400">resets {resetLabel(m.resetsAt)}</div>
      </div>
    </div>
  )
}
