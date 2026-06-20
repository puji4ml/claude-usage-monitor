import type { UsageSnapshot } from '@shared/types'

export function HistoryChart({ data }: { data: UsageSnapshot[] }) {
  if (data.length < 2) {
    return <div className="px-1 text-xs text-zinc-500">Collecting history…</div>
  }
  const w = 312
  const h = 56
  const max = 100
  const pt = (s: UsageSnapshot, i: number) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (Math.min(max, s.weekly.usedPct) / max) * (h - 4) - 2
    return x + ',' + y
  }
  const line = data.map(pt).join(' ')
  const area = '0,' + h + ' ' + line + ' ' + w + ',' + h
  return (
    <svg width="100%" height={h} viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(52,211,153,0.35)" />
          <stop offset="100%" stopColor="rgba(52,211,153,0)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#usageFill)" />
      <polyline points={line} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
