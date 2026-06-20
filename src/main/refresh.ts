import { fetchUsage, NotAuthenticatedError } from './usage/client'
import { recordSnapshot } from './history/store'
import { evaluateThresholds, fireAlerts, type NotifyState } from './notify/notifier'
import { loadSettings } from './settings/store'
import type { UsageState, UsageSnapshot } from '@shared/types'

let lastSnapshot: UsageSnapshot | null = null
let lastState: UsageState = { status: 'ok', snapshot: null }
let notifyState: NotifyState = { session: 'none', weekly: 'none' }
let refreshing = false

export function currentState(): UsageState {
  return lastState
}

export async function runRefresh(): Promise<UsageState> {
  // Guard against overlapping refreshes (scheduler tick + manual click) that
  // could double-fire threshold alerts.
  if (refreshing) return lastState
  refreshing = true
  try {
    const snap = await fetchUsage()
    lastSnapshot = snap
    await recordSnapshot(snap)
    const settings = await loadSettings()
    const { alerts, next } = evaluateThresholds(snap, settings.thresholds, notifyState)
    notifyState = next
    fireAlerts(alerts)
    lastState = { status: 'ok', snapshot: snap }
  } catch (err) {
    if (err instanceof NotAuthenticatedError) {
      lastState = { status: 'relogin', snapshot: lastSnapshot, message: err.message }
    } else {
      lastState = {
        status: lastSnapshot ? 'stale' : 'error',
        snapshot: lastSnapshot,
        message: (err as Error).message
      }
    }
  } finally {
    refreshing = false
  }
  return lastState
}
