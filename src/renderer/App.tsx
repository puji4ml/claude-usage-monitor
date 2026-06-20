import { PanelView } from './views/PanelView'
import { SettingsView } from './views/SettingsView'

export default function App() {
  const route = window.location.hash.replace('#', '') || 'panel'
  if (route === 'settings') return <SettingsView />
  // 'panel' and 'widget' share the panel content
  return <PanelView />
}
