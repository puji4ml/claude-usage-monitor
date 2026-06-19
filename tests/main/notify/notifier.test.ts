import { describe, it, expect } from 'vitest'
import { evaluateThresholds, type NotifyState } from '../../../src/main/notify/notifier'
import type { UsageSnapshot } from '../../../src/shared/types'

function snap(sessionPct: number, weeklyPct: number): UsageSnapshot {
  return {
    capturedAt: '2026-06-19T12:00:00Z',
    session: { usedPct: sessionPct, used: 0, limit: 100, resetsAt: '' },
    weekly: { usedPct: weeklyPct, used: 0, limit: 100, resetsAt: '' }
  }
}
const cfg = { amber: 70, red: 90 }

describe('evaluateThresholds', () => {
  it('emits a red alert for the session when crossing 90', () => {
    const prev: NotifyState = { session: 'none', weekly: 'none' }
    const { alerts, next } = evaluateThresholds(snap(92, 10), cfg, prev)
    expect(alerts).toEqual([{ metric: 'session', level: 'red', pct: 92 }])
    expect(next.session).toBe('red')
  })
  it('does not re-alert at the same level on the next tick', () => {
    const prev: NotifyState = { session: 'red', weekly: 'none' }
    const { alerts } = evaluateThresholds(snap(93, 10), cfg, prev)
    expect(alerts).toHaveLength(0)
  })
  it('resets to none when usage drops after a window reset', () => {
    const prev: NotifyState = { session: 'red', weekly: 'none' }
    const { next } = evaluateThresholds(snap(5, 10), cfg, prev)
    expect(next.session).toBe('none')
  })
})
