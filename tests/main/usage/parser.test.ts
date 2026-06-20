import { describe, it, expect } from 'vitest'
import { parseUsage } from '../../../src/main/usage/parser'
import fixture from '../../fixtures/usage-response.sample.json'

describe('parseUsage', () => {
  it('maps five_hour -> session and seven_day -> weekly', () => {
    const snap = parseUsage(fixture, '2026-06-19T12:00:00Z')
    expect(snap.session.usedPct).toBe(42)
    expect(snap.session.resetsAt).toBe('2026-06-19T18:00:00.000000+00:00')
    expect(snap.weekly.usedPct).toBe(73)
    expect(snap.capturedAt).toBe('2026-06-19T12:00:00Z')
  })
  it('throws a specific error when a window is missing', () => {
    expect(() => parseUsage({ five_hour: {} }, '2026-06-19T12:00:00Z')).toThrowError(
      /usage parse failed/i
    )
  })
})
