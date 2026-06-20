import type { UsageState, UsageSnapshot, Settings } from '@shared/types'

interface Api {
  getState(): Promise<UsageState>
  refresh(): Promise<void>
  getHistory(): Promise<UsageSnapshot[]>
  getSettings(): Promise<Settings>
  setSettings(s: Settings): Promise<void>
  openLogin(): Promise<void>
  onState(cb: (s: UsageState) => void): () => void
}

declare global {
  interface Window {
    api: Api
  }
}

export const api: Api = window.api
