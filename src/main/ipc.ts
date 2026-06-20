import { ipcMain, BrowserWindow, screen } from 'electron'
import { IPC } from '@shared/types'
import type { UsageState } from '@shared/types'
import { runRefresh, currentState } from './refresh'
import { loadSettings, saveSettings } from './settings/store'
import { loadHistory } from './history/store'
import { openLoginWindow } from './auth/session'
import { startScheduler, stopScheduler } from './scheduler'
import { MIN_SIZE, PANEL_DEFAULT } from './windows'

type Broadcast = (state: UsageState) => void

export function registerIpc(
  getWindows: () => BrowserWindow[],
  setWidgetVisible: (visible: boolean) => void
): {
  broadcast: Broadcast
  doRefresh: () => Promise<void>
} {
  const broadcast: Broadcast = (state) => {
    for (const w of getWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send(IPC.onState, state)
      }
    }
  }
  const doRefresh = async (): Promise<void> => {
    broadcast(await runRefresh())
  }

  ipcMain.handle(IPC.getState, () => currentState())
  ipcMain.handle(IPC.refresh, doRefresh)
  ipcMain.handle(IPC.getHistory, () => loadHistory())
  ipcMain.handle(IPC.getSettings, () => loadSettings())
  ipcMain.handle(IPC.setSettings, async (_e, s) => {
    await saveSettings(s)
    const fresh = await loadSettings()
    stopScheduler()
    startScheduler(fresh.refreshMinutes, () => void doRefresh())
    // Show/hide the floating widget immediately rather than only at next launch.
    setWidgetVisible(fresh.showWidget)
  })

  ipcMain.handle(IPC.setWindowSize, (e, width: number, height: number) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win || win.isDestroyed()) return
    win.setContentSize(
      Math.max(MIN_SIZE.width, Math.round(width)),
      Math.max(MIN_SIZE.height, Math.round(height))
    )
  })

  ipcMain.handle(IPC.resetWindow, (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win || win.isDestroyed()) return
    win.setContentSize(PANEL_DEFAULT.width, PANEL_DEFAULT.height)
    const display = screen.getDisplayNearestPoint(win.getBounds())
    const { workArea } = display
    const { width } = win.getBounds()
    win.setPosition(workArea.x + workArea.width - width - 16, workArea.y + 16)
  })
  ipcMain.handle(IPC.openLogin, async () => {
    try {
      await openLoginWindow()
      await doRefresh()
    } catch (err) {
      console.error('[auth] openLogin failed:', err)
    }
  })

  return { broadcast, doRefresh }
}
