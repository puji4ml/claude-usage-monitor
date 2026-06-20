import { app, BrowserWindow, screen } from 'electron'
import { createPanelWindow, createWidgetWindow } from './windows'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { startScheduler } from './scheduler'
import { loadSettings } from './settings/store'
import { isLoggedIn, openLoginWindow } from './auth/session'

let panel: BrowserWindow
let widget: BrowserWindow | null = null

function showPanelTopRight(): void {
  if (!panel || panel.isDestroyed()) return
  const { workArea } = screen.getPrimaryDisplay()
  const { width } = panel.getBounds()
  panel.setPosition(workArea.x + workArea.width - width - 16, workArea.y + 16)
  panel.show()
  panel.focus()
}

// Single instance: a second launch focuses the existing window instead of
// stacking another tray app.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showPanelTopRight())

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
    showPanelTopRight()
    startScheduler(settings.refreshMinutes, () => void doRefresh())
  })

  // Tray app: do not quit when windows are hidden/closed; quit via tray menu.
  app.on('window-all-closed', () => {})
}
