import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/types'
import type { UsageState } from '@shared/types'
import { runRefresh, currentState } from './refresh'
import { loadSettings, saveSettings } from './settings/store'
import { loadHistory } from './history/store'
import { openLoginWindow } from './auth/session'
import { startScheduler, stopScheduler } from './scheduler'

type Broadcast = (state: UsageState) => void

export function registerIpc(getWindows: () => BrowserWindow[]): {
  broadcast: Broadcast
  doRefresh: () => Promise<void>
} {
  const broadcast: Broadcast = (state) =>
    getWindows().forEach((w) => w.webContents.send(IPC.onState, state))
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
    // Re-arm the scheduler so a changed refresh interval takes effect now.
    stopScheduler()
    startScheduler(fresh.refreshMinutes, () => void doRefresh())
  })
  ipcMain.handle(IPC.openLogin, async () => {
    await openLoginWindow()
    await doRefresh()
  })

  return { broadcast, doRefresh }
}
