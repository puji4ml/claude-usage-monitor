import type { UsageSnapshot, UsageMetric } from '@shared/types'

function metric(node: any, name: string): UsageMetric {
  if (!node || typeof node.utilization !== 'number' || typeof node.limit !== 'number') {
    throw new Error(`usage parse failed: missing or invalid "${name}" fields`)
  }
  return {
    usedPct: node.utilization,
    used: Number(node.used ?? 0),
    limit: node.limit,
    resetsAt: String(node.resets_at ?? '')
  }
}

export function parseUsage(raw: any, capturedAt: string): UsageSnapshot {
  return {
    capturedAt,
    session: metric(raw?.session, 'session'),
    weekly: metric(raw?.weekly, 'weekly')
  }
}
