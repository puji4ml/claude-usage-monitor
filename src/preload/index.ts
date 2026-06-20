import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { UsageState, UsageSnapshot, Settings } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  getState: (): Promise<UsageState> => ipcRenderer.invoke(IPC.getState),
  refresh: (): Promise<void> => ipcRenderer.invoke(IPC.refresh),
  getHistory: (): Promise<UsageSnapshot[]> => ipcRenderer.invoke(IPC.getHistory),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (s: Settings): Promise<void> => ipcRenderer.invoke(IPC.setSettings, s),
  openLogin: (): Promise<void> => ipcRenderer.invoke(IPC.openLogin),
  onState: (cb: (s: UsageState) => void) => {
    const handler = (_e: unknown, s: UsageState) => cb(s)
    ipcRenderer.on(IPC.onState, handler)
    return () => ipcRenderer.removeListener(IPC.onState, handler)
  }
})
