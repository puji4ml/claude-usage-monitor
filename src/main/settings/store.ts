import { app, safeStorage } from 'electron'
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

export function mergeSettings(partial: Partial<Settings>): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...partial,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(partial.thresholds ?? {}) }
  }
  merged.refreshMinutes = Math.max(1, Math.floor(merged.refreshMinutes))
  return merged
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}
function sessionFile(): string {
  return join(app.getPath('userData'), 'session.bin')
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

export async function saveSession(token: string): Promise<void> {
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(token)
    : Buffer.from(token, 'utf8')
  await fs.writeFile(sessionFile(), buf)
}

export async function loadSession(): Promise<string | null> {
  try {
    const buf = await fs.readFile(sessionFile())
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf8')
  } catch {
    return null
  }
}
