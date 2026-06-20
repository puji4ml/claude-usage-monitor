import { useEffect, useState } from 'react'
import type { UsageState, UsageSnapshot, Settings } from '@shared/types'
import { api } from '../lib/ipc'
import { UsageMeter } from '../components/UsageMeter'
import { HistoryChart } from '../components/HistoryChart'
import { StaleBadge } from '../components/StaleBadge'
import { ReloginPrompt } from '../components/ReloginPrompt'

export function PanelView() {
  const [state, setState] = useState<UsageState | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [history, setHistory] = useState<UsageSnapshot[]>([])

  useEffect(() => {
    api.getState().then(setState)
    api.getSettings().then(setSettings)
    // Seed from the 7-day history persisted by the main process so the chart
    // survives panel hide/show remounts instead of starting empty each time.
    api.getHistory().then(setHistory)
    return api.onState((s) => {
      setState(s)
      if (s.snapshot) {
        const snap = s.snapshot
        setHistory((h) => [...h, snap].slice(-500))
      }
    })
  }, [])

  if (!state || !settings) return <div className="p-4 text-sm">Loading…</div>
  if (state.status === 'relogin') return <ReloginPrompt />
  const snap = state.snapshot
  if (!snap) return <div className="p-4 text-sm">No data yet.</div>
  const { amber, red } = settings.thresholds

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Claude usage</span>
        <div className="flex items-center gap-2">
          {state.status === 'stale' && <StaleBadge />}
          <button
            className="text-xs opacity-60 hover:opacity-100"
            onClick={() => api.refresh()}
          >
            Refresh
          </button>
        </div>
      </div>
      <UsageMeter label="Session" m={snap.session} amber={amber} red={red} />
      <UsageMeter label="Weekly" m={snap.weekly} amber={amber} red={red} />
      <HistoryChart data={history} />
    </div>
  )
}
