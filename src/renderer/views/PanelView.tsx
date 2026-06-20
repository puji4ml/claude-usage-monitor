import { useEffect, useState } from 'react'
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import type { UsageState, UsageSnapshot, Settings } from '@shared/types'
import { api } from '../lib/ipc'
import { UsageMeter } from '../components/UsageMeter'
import { HistoryChart } from '../components/HistoryChart'
import { StaleBadge } from '../components/StaleBadge'
import { ReloginPrompt } from '../components/ReloginPrompt'

export function PanelView({ onSettings }: { onSettings: () => void }) {
  const [state, setState] = useState<UsageState | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [history, setHistory] = useState<UsageSnapshot[]>([])

  useEffect(() => {
    api.getState().then(setState)
    api.getSettings().then(setSettings)
    api.getHistory().then(setHistory)
    return api.onState((s) => {
      setState(s)
      if (s.snapshot) {
        const snap = s.snapshot
        setHistory((h) => [...h, snap].slice(-500))
      }
    })
  }, [])

  if (!state || !settings) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading…</div>
  }
  if (state.status === 'relogin') return <ReloginPrompt />
  const snap = state.snapshot
  const { amber, red } = settings.thresholds

  return (
    <div className="flex h-full flex-col">
      <header className="app-drag flex items-center justify-between px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">Claude Usage</span>
          {state.status === 'stale' && <StaleBadge />}
        </div>
        <div className="app-no-drag flex items-center gap-1">
          <button
            onClick={() => api.refresh()}
            title="Refresh"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={onSettings}
            title="Settings"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden px-5 pb-4">
        {!snap ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">No data yet.</div>
        ) : (
          <>
            <UsageMeter label="Session" m={snap.session} amber={amber} red={red} />
            <UsageMeter label="Weekly" m={snap.weekly} amber={amber} red={red} />
            <div className="mt-1 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Past 7 days
            </div>
            <HistoryChart data={history} />
          </>
        )}
      </div>
    </div>
  )
}
