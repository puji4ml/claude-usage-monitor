import type { UsageSnapshot } from '@shared/types'

export function HistoryChart({ data }: { data: UsageSnapshot[] }) {
  if (data.length < 2) {
    return <div className="text-xs opacity-50">Collecting history…</div>
  }
  const w = 300
  const h = 80
  const max = 100
  const pts = data
    .map((s, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - (s.weekly.usedPct / max) * h
      return x + ',' + y
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} className="text-emerald-500">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
