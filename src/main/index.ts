import { app, BrowserWindow, screen, Tray } from 'electron'
import { createPanelWindow, createWidgetWindow } from './windows'
import { createTray, setTrayUsage } from './tray'
import { registerIpc } from './ipc'
import { startScheduler } from './scheduler'
import { loadSettings } from './settings/store'
import { currentState } from './refresh'
import { isLoggedIn, openLoginWindow } from './auth/session'

let panel: BrowserWindow
let widget: BrowserWindow | null = null
let tray: Tray

function showPanelTopRight(): void {
  if (!panel || panel.isDestroyed()) return
  const { workArea } = screen.getPrimaryDisplay()
  const { width } = panel.getBounds()
  panel.setPosition(workArea.x + workArea.width - width - 16, workArea.y + 16)
  panel.show()
  panel.focus()
}

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

    const tick = async (): Promise<void> => {
      await doRefresh()
      setTrayUsage(tray, currentState().snapshot)
    }

    tray = createTray({
      onShow: showPanelTopRight,
      onRefresh: () => void tick(),
      onQuit: () => app.quit()
    })

    if (!(await isLoggedIn())) await openLoginWindow()
    await tick()
    showPanelTopRight()
    startScheduler(settings.refreshMinutes, () => void tick())
  })

  // Tray app: do not quit when windows are hidden/closed; quit via tray menu.
  app.on('window-all-closed', () => {})
}
