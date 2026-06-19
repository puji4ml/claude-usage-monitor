import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { UsageSnapshot } from '@shared/types'

export function appendSnapshot(list: UsageSnapshot[], snap: UsageSnapshot): UsageSnapshot[] {
  return [...list, snap]
}

export function pruneOlderThan(list: UsageSnapshot[], now: Date, days: number): UsageSnapshot[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return list.filter((s) => new Date(s.capturedAt).getTime() >= cutoff)
}

function file(): string {
  return join(app.getPath('userData'), 'history.json')
}

export async function loadHistory(): Promise<UsageSnapshot[]> {
  try {
    return JSON.parse(await fs.readFile(file(), 'utf8'))
  } catch {
    return []
  }
}

export async function saveHistory(list: UsageSnapshot[]): Promise<void> {
  await fs.writeFile(file(), JSON.stringify(list), 'utf8')
}

export async function recordSnapshot(snap: UsageSnapshot): Promise<UsageSnapshot[]> {
  const next = pruneOlderThan(appendSnapshot(await loadHistory(), snap), new Date(), 7)
  await saveHistory(next)
  return next
}
