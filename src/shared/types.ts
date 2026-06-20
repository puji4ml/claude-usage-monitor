export interface UsageMetric {
  usedPct: number
  used: number
  limit: number
  resetsAt: string
}

export interface UsageSnapshot {
  capturedAt: string
  session: UsageMetric
  weekly: UsageMetric
}

export type AppStatus = 'ok' | 'stale' | 'relogin' | 'error'

export interface UsageState {
  status: AppStatus
  snapshot: UsageSnapshot | null
  message?: string
}

export interface Settings {
  refreshMinutes: number
  thresholds: { amber: number; red: number }
  theme: 'system' | 'dark' | 'light'
  compact: boolean
  showWidget: boolean
}

export const IPC = {
  getState: 'usage:getState',
  onState: 'usage:onState',
  refresh: 'usage:refresh',
  getHistory: 'usage:getHistory',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  openLogin: 'auth:openLogin'
} as const
