import { fetchUsage, NotAuthenticatedError } from './usage/client'
import { recordSnapshot } from './history/store'
import { evaluateThresholds, fireAlerts, type NotifyState } from './notify/notifier'
import { loadSettings } from './settings/store'
import type { UsageState, UsageSnapshot } from '@shared/types'

let lastSnapshot: UsageSnapshot | null = null
let notifyState: NotifyState = { session: 'none', weekly: 'none' }

export function currentSnapshot(): UsageSnapshot | null {
  return lastSnapshot
}

export async function runRefresh(): Promise<UsageState> {
  try {
    const snap = await fetchUsage()
    lastSnapshot = snap
    await recordSnapshot(snap)
    const settings = await loadSettings()
    const { alerts, next } = evaluateThresholds(snap, settings.thresholds, notifyState)
    notifyState = next
    fireAlerts(alerts)
    return { status: 'ok', snapshot: snap }
  } catch (err) {
    if (err instanceof NotAuthenticatedError) {
      return { status: 'relogin', snapshot: lastSnapshot, message: err.message }
    }
    return {
      status: lastSnapshot ? 'stale' : 'error',
      snapshot: lastSnapshot,
      message: (err as Error).message
    }
  }
}
