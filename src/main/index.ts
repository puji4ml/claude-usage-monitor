import { app, BrowserWindow } from 'electron'
import { createPanelWindow, createWidgetWindow } from './windows'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { startScheduler } from './scheduler'
import { loadSettings } from './settings/store'
import { isLoggedIn, openLoginWindow } from './auth/session'

let panel: BrowserWindow
let widget: BrowserWindow | null = null

app.whenReady().then(async () => {
  panel = createPanelWindow()
  const settings = await loadSettings()
  if (settings.showWidget) widget = createWidgetWindow()

  const windows = (): BrowserWindow[] =>
    [panel, widget].filter(Boolean) as BrowserWindow[]
  const { doRefresh } = registerIpc(windows)
  createTray(
    panel,
    () => void doRefresh(),
    () => app.quit()
  )

  if (!(await isLoggedIn())) await openLoginWindow()
  await doRefresh()
  startScheduler(settings.refreshMinutes, () => void doRefresh())
})

// Tray app: deliberately do not quit when all windows are hidden/closed.
// Quit happens only via the tray menu (app.quit()).
app.on('window-all-closed', () => {})
