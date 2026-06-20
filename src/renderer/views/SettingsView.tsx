import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types'
import { api } from '../lib/ipc'

export function SettingsView() {
  const [s, setS] = useState<Settings | null>(null)
  useEffect(() => {
    api.getSettings().then(setS)
  }, [])
  if (!s) return <div className="p-4 text-sm">Loading…</div>
  const save = (next: Settings) => {
    setS(next)
    api.setSettings(next)
  }
  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <label className="flex items-center justify-between">
        Refresh (min)
        <input
          type="number"
          min={1}
          value={s.refreshMinutes}
          className="w-16 rounded border px-1"
          onChange={(e) => save({ ...s, refreshMinutes: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center justify-between">
        Amber %
        <input
          type="number"
          value={s.thresholds.amber}
          className="w-16 rounded border px-1"
          onChange={(e) =>
            save({ ...s, thresholds: { ...s.thresholds, amber: Number(e.target.value) } })
          }
        />
      </label>
      <label className="flex items-center justify-between">
        Red %
        <input
          type="number"
          value={s.thresholds.red}
          className="w-16 rounded border px-1"
          onChange={(e) =>
            save({ ...s, thresholds: { ...s.thresholds, red: Number(e.target.value) } })
          }
        />
      </label>
      <label className="flex items-center justify-between">
        Theme
        <select
          value={s.theme}
          className="rounded border px-1"
          onChange={(e) => save({ ...s, theme: e.target.value as Settings['theme'] })}
        >
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <label className="flex items-center justify-between">
        Floating widget
        <input
          type="checkbox"
          checked={s.showWidget}
          onChange={(e) => save({ ...s, showWidget: e.target.checked })}
        />
      </label>
    </div>
  )
}
