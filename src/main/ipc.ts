import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/types'
import type { UsageState } from '@shared/types'
import { runRefresh, currentSnapshot } from './refresh'
import { loadSettings, saveSettings } from './settings/store'
import { openLoginWindow } from './auth/session'

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

  ipcMain.handle(IPC.getState, async (): Promise<UsageState> => ({
    status: 'ok',
    snapshot: currentSnapshot()
  }))
  ipcMain.handle(IPC.refresh, doRefresh)
  ipcMain.handle(IPC.getSettings, () => loadSettings())
  ipcMain.handle(IPC.setSettings, (_e, s) => saveSettings(s))
  ipcMain.handle(IPC.openLogin, async () => {
    await openLoginWindow()
    await doRefresh()
  })

  return { broadcast, doRefresh }
}
