import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { Settings } from '@shared/types'
import { api } from '../lib/ipc'

const field =
  'w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-right text-zinc-100 outline-none focus:border-white/25'

export function SettingsView({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<Settings | null>(null)
  useEffect(() => {
    api.getSettings().then(setS)
  }, [])
  const save = (next: Settings) => {
    setS(next)
    api.setSettings(next)
  }
  if (!s) return <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading…</div>
  return (
    <div className="flex h-full flex-col">
      <header className="app-drag flex items-center gap-2 px-4 pb-3 pt-4">
        <button
          onClick={onBack}
          className="app-no-drag rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">Settings</span>
      </header>
      <div className="flex flex-col gap-3.5 px-5 pb-5 text-sm text-zinc-300">
        <label className="flex items-center justify-between">
          Refresh interval (min)
          <input
            type="number"
            min={1}
            value={s.refreshMinutes}
            className={field}
            onChange={(e) => save({ ...s, refreshMinutes: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center justify-between">
          Amber threshold %
          <input
            type="number"
            value={s.thresholds.amber}
            className={field}
            onChange={(e) => save({ ...s, thresholds: { ...s.thresholds, amber: Number(e.target.value) } })}
          />
        </label>
        <label className="flex items-center justify-between">
          Red threshold %
          <input
            type="number"
            value={s.thresholds.red}
            className={field}
            onChange={(e) => save({ ...s, thresholds: { ...s.thresholds, red: Number(e.target.value) } })}
          />
        </label>
        <div className="app-no-drag flex flex-col gap-1">
          <label className="flex items-center justify-between">
            Floating widget
            <input
              type="checkbox"
              checked={s.showWidget}
              onChange={(e) => save({ ...s, showWidget: e.target.checked })}
            />
          </label>
          <p className="text-xs leading-snug text-zinc-500">
            Keeps a small always-on-top window pinned over other apps so your usage stays visible.
            Turn it off to use only the tray popover.
          </p>
        </div>

        <div className="app-no-drag mt-1 flex flex-col gap-1 border-t border-white/10 pt-3">
          <button
            onClick={() => api.resetWindow()}
            className="self-start rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-white/10"
          >
            Reset window position &amp; size
          </button>
          <p className="text-xs leading-snug text-zinc-500">
            Drag a window by its title bar to move it, and drag the bottom-right corner to resize.
            Use this if a window ends up off-screen.
          </p>
        </div>
      </div>
    </div>
  )
}
