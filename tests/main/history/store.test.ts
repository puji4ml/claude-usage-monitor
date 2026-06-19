import { describe, it, expect } from 'vitest'
import { appendSnapshot, pruneOlderThan } from '../../../src/main/history/store'
import type { UsageSnapshot } from '../../../src/shared/types'

function snap(capturedAt: string): UsageSnapshot {
  const m = { usedPct: 1, used: 1, limit: 100, resetsAt: capturedAt }
  return { capturedAt, session: m, weekly: m }
}

describe('history store', () => {
  it('appends to an existing list', () => {
    const list = [snap('2026-06-18T00:00:00Z')]
    const out = appendSnapshot(list, snap('2026-06-19T00:00:00Z'))
    expect(out).toHaveLength(2)
    expect(out[1].capturedAt).toBe('2026-06-19T00:00:00Z')
  })
  it('prunes entries older than the cutoff', () => {
    const now = new Date('2026-06-19T00:00:00Z')
    const list = [snap('2026-06-10T00:00:00Z'), snap('2026-06-18T00:00:00Z')]
    const out = pruneOlderThan(list, now, 7)
    expect(out).toHaveLength(1)
    expect(out[0].capturedAt).toBe('2026-06-18T00:00:00Z')
  })
})
