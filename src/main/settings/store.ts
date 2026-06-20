import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Settings } from '@shared/types'

export const DEFAULT_SETTINGS: Settings = {
  refreshMinutes: 5,
  thresholds: { amber: 70, red: 90 },
  theme: 'system',
  compact: false,
  showWidget: false
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function mergeSettings(partial: Partial<Settings>): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...partial,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(partial.thresholds ?? {}) }
  }
  merged.refreshMinutes = Math.max(1, Math.floor(merged.refreshMinutes))
  merged.thresholds.amber = clamp(merged.thresholds.amber, 0, 100)
  merged.thresholds.red = clamp(merged.thresholds.red, merged.thresholds.amber, 100)
  return merged
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<Settings> {
  try {
    return mergeSettings(JSON.parse(await fs.readFile(settingsFile(), 'utf8')))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await fs.writeFile(settingsFile(), JSON.stringify(mergeSettings(s)), 'utf8')
}
