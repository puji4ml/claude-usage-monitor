import { describe, it, expect } from 'vitest'
import { countdown, pct } from '../../../src/renderer/lib/format'

describe('format', () => {
  it('formats a countdown as Hh Mm', () => {
    const now = new Date('2026-06-19T12:00:00Z')
    expect(countdown('2026-06-19T14:30:00Z', now)).toBe('2h 30m')
  })
  it('shows reset reached at zero', () => {
    const now = new Date('2026-06-19T15:00:00Z')
    expect(countdown('2026-06-19T14:30:00Z', now)).toBe('resetting…')
  })
  it('rounds percent', () => {
    expect(pct(42.6)).toBe('43%')
  })
})
