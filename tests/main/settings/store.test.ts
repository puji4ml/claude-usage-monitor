import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings } from '../../../src/main/settings/store'

describe('settings merge', () => {
  it('fills missing fields with defaults', () => {
    const out = mergeSettings({ refreshMinutes: 10 })
    expect(out.refreshMinutes).toBe(10)
    expect(out.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(out.thresholds).toEqual(DEFAULT_SETTINGS.thresholds)
  })
  it('clamps refreshMinutes to a sane minimum', () => {
    const out = mergeSettings({ refreshMinutes: 0 })
    expect(out.refreshMinutes).toBeGreaterThanOrEqual(1)
  })
})
