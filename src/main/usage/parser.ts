import type { UsageSnapshot, UsageMetric } from '@shared/types'

// The claude.ai usage endpoint returns a "five_hour" (rolling session) window
// and a "seven_day" (weekly all-models) window, each with a numeric
// "utilization" percent and an ISO "resets_at". Token/dollar counts are not
// provided for the subscription, so the snapshot tracks percent + reset only.
function metric(node: any, name: string): UsageMetric {
  if (!node || typeof node.utilization !== 'number') {
    throw new Error('usage parse failed: missing or invalid "' + name + '" fields')
  }
  return {
    usedPct: node.utilization,
    resetsAt: String(node.resets_at ?? '')
  }
}

export function parseUsage(raw: any, capturedAt: string): UsageSnapshot {
  return {
    capturedAt,
    session: metric(raw?.five_hour, 'five_hour'),
    weekly: metric(raw?.seven_day, 'seven_day')
  }
}
