import { useState } from 'react'
import { PanelView } from './views/PanelView'
import { SettingsView } from './views/SettingsView'
import { ResizeGrip } from './components/ResizeGrip'

export default function App() {
  const initial = window.location.hash.replace('#', '') === 'settings' ? 'settings' : 'panel'
  const [view, setView] = useState<'panel' | 'settings'>(initial)
  return (
    <div className="h-full p-2">
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/90 text-zinc-100 shadow-2xl ring-1 ring-white/5 backdrop-blur-2xl">
        {view === 'settings' ? (
          <SettingsView onBack={() => setView('panel')} />
        ) : (
          <PanelView onSettings={() => setView('settings')} />
        )}
      </div>
      <ResizeGrip />
    </div>
  )
}
