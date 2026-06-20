import { app, BrowserWindow, screen, Tray } from 'electron'
import { createPanelWindow, createWidgetWindow } from './windows'
import { createTray, setTrayUsage } from './tray'
import { registerIpc } from './ipc'
import { startScheduler } from './scheduler'
import { loadSettings } from './settings/store'
import { currentState } from './refresh'
import { isLoggedIn, openLoginWindow } from './auth/session'
import { loadWindowState, saveBounds, type Bounds } from './windowState'

let panel: BrowserWindow
let widget: BrowserWindow | null = null
let tray: Tray
let panelHasSavedBounds = false

// A saved position is only valid if it still falls on a connected display, so a
// window can't get stranded off-screen after a monitor change.
function isOnScreen(b: Bounds): boolean {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea
    return (
      b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y
    )
  })
}

// Persist a window's position and size (debounced) whenever the user drags or
// resizes it, so it reopens exactly where they left it.
function trackBounds(win: BrowserWindow, key: 'panel' | 'widget'): void {
  let timer: NodeJS.Timeout | null = null
  const save = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (!win.isDestroyed()) void saveBounds(key, win.getBounds())
    }, 400)
  }
  win.on('move', save)
  win.on('resize', save)
}

function showPanel(): void {
  if (!panel || panel.isDestroyed()) return
  if (!panelHasSavedBounds) {
    const { workArea } = screen.getPrimaryDisplay()
    const { width } = panel.getBounds()
    panel.setPosition(workArea.x + workArea.width - width - 16, workArea.y + 16)
  }
  panel.show()
  panel.focus()
}

// One window at a time: when the floating widget is enabled it is the active
// surface, so the tray reveals it; otherwise the tray opens the panel popover.
function showPrimary(): void {
  if (widget && !widget.isDestroyed()) {
    widget.show()
    widget.focus()
  } else {
    showPanel()
  }
}

function setWidgetVisible(visible: boolean): void {
  if (visible && !widget) {
    const w = createWidgetWindow()
    widget = w
    void loadWindowState().then((st) => {
      if (st.widget && isOnScreen(st.widget) && !w.isDestroyed()) w.setBounds(st.widget)
    })
    trackBounds(w, 'widget')
    w.on('closed', () => {
      if (widget === w) widget = null
    })
    // The widget replaces the panel as the visible window, so hide the panel to
    // avoid two identical windows being open at once.
    if (!panel.isDestroyed() && panel.isVisible()) panel.hide()
  } else if (!visible && widget) {
    const w = widget
    widget = null
    if (!w.isDestroyed()) w.destroy()
    // Falling back from the widget: show the panel so something stays on screen.
    showPanel()
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showPrimary())

  app.whenReady().then(async () => {
    panel = createPanelWindow()
    const state = await loadWindowState()
    if (state.panel && isOnScreen(state.panel)) {
      panel.setBounds(state.panel)
      panelHasSavedBounds = true
    }
    trackBounds(panel, 'panel')

    const settings = await loadSettings()
    if (settings.showWidget) setWidgetVisible(true)

    const windows = (): BrowserWindow[] => [panel, widget].filter(Boolean) as BrowserWindow[]
    const { doRefresh } = registerIpc(windows, setWidgetVisible)

    const tick = async (): Promise<void> => {
      await doRefresh()
      setTrayUsage(tray, currentState().snapshot)
    }

    tray = createTray({
      onShow: showPrimary,
      onRefresh: () => void tick(),
      onQuit: () => app.quit()
    })

    if (!(await isLoggedIn())) await openLoginWindow()
    await tick()
    // Show exactly one window at startup. When the floating widget is enabled it
    // is the persistent always-on-top surface, so don't also pop the panel (that
    // produced two identical windows). With no widget, open the panel so there is
    // something on screen. The panel stays reachable any time via the tray icon.
    if (!widget) showPanel()
    startScheduler(settings.refreshMinutes, () => void tick())
  })

  // Tray app: do not quit when windows are hidden/closed; quit via tray menu.
  app.on('window-all-closed', () => {})
}
