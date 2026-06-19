import { Notification } from 'electron'
import type { UsageSnapshot } from '@shared/types'

export type Level = 'none' | 'amber' | 'red'
export type Metric = 'session' | 'weekly'
export interface NotifyState { session: Level; weekly: Level }
export interface ThresholdCfg { amber: number; red: number }
export interface Alert { metric: Metric; level: Exclude<Level, 'none'>; pct: number }

function levelFor(pct: number, cfg: ThresholdCfg): Level {
  if (pct >= cfg.red) return 'red'
  if (pct >= cfg.amber) return 'amber'
  return 'none'
}

const RANK: Record<Level, number> = { none: 0, amber: 1, red: 2 }

export function evaluateThresholds(
  snap: UsageSnapshot,
  cfg: ThresholdCfg,
  prev: NotifyState
): { alerts: Alert[]; next: NotifyState } {
  const alerts: Alert[] = []
  const next: NotifyState = { ...prev }
  for (const metric of ['session', 'weekly'] as Metric[]) {
    const pct = snap[metric].usedPct
    const lvl = levelFor(pct, cfg)
    if (RANK[lvl] > RANK[prev[metric]]) alerts.push({ metric, level: lvl as Alert['level'], pct })
    next[metric] = lvl
  }
  return { alerts, next }
}

export function fireAlerts(alerts: Alert[]): void {
  for (const a of alerts) {
    const sev = a.level === 'red' ? 'critical' : 'high'
    new Notification({
      title: 'Claude ' + a.metric + ' usage ' + sev,
      body: a.metric + ' is at ' + Math.round(a.pct) + '%'
    }).show()
  }
}
