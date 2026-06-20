import { useState } from 'react'
import { PanelView } from './views/PanelView'
import { SettingsView } from './views/SettingsView'

export default function App() {
  const initial = window.location.hash.replace('#', '') === 'settings' ? 'settings' : 'panel'
  const [view, setView] = useState<'panel' | 'settings'>(initial)
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-zinc-900/55 text-zinc-100 shadow-2xl ring-1 ring-black/40 backdrop-blur-2xl">
      {view === 'settings' ? (
        <SettingsView onBack={() => setView('panel')} />
      ) : (
        <PanelView onSettings={() => setView('settings')} />
      )}
    </div>
  )
}
