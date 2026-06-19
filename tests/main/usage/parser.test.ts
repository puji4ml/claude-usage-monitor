import { describe, it, expect } from 'vitest'
import { parseUsage } from '../../../src/main/usage/parser'
import fixture from '../../fixtures/usage-response.sample.json'

describe('parseUsage', () => {
  it('maps raw fields into a UsageSnapshot', () => {
    const snap = parseUsage(fixture, '2026-06-19T12:00:00Z')
    expect(snap.session.usedPct).toBe(42)
    expect(snap.session.limit).toBe(100000)
    expect(snap.weekly.resetsAt).toBe('2026-06-23T00:00:00Z')
    expect(snap.capturedAt).toBe('2026-06-19T12:00:00Z')
  })
  it('throws a specific error when a field is missing', () => {
    expect(() => parseUsage({ session: {} }, '2026-06-19T12:00:00Z')).toThrowError(
      /usage parse failed/i
    )
  })
})
