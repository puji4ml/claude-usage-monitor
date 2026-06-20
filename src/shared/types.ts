export interface UsageMetric {
  /** Percent of the limit consumed (0-100), from the API "utilization" field. */
  usedPct: number
  /** ISO timestamp when this window resets. */
  resetsAt: string
}

export interface UsageSnapshot {
  capturedAt: string
  /** 5-hour rolling session window (API: five_hour). */
  session: UsageMetric
  /** 7-day all-models window (API: seven_day). */
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
  openLogin: 'auth:openLogin',
  setWindowSize: 'window:setSize',
  resetWindow: 'window:reset'
} as const
