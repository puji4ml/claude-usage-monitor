# Claude Usage Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal Electron desktop app that displays Claude session and weekly usage (percent, reset countdown, 7-day history, notifications), mirroring the Claude app's Usage screen.

**Architecture:** Two-process Electron app. The main process owns the claude.ai session, all network calls, scheduling, storage, and notifications. The React renderer displays a normalized `UsageSnapshot` received over a typed IPC bridge and never touches the network or the session cookie. Pure logic (parser, history, thresholds, settings) is isolated and unit-tested; auth and network are integration code mocked at their boundaries.

**Tech Stack:** Electron, TypeScript, electron-vite, React, Vite, Tailwind CSS v3, Vitest, electron-builder. Charting via custom SVG.

---

## File Structure

```
claude-usage-monitor/
  package.json
  electron.vite.config.ts
  tsconfig.json
  tsconfig.node.json
  tailwind.config.js
  postcss.config.js
  vitest.config.ts
  DESIGN.md                         # copied from Apple design-md at UI phase
  electron-builder.yml
  src/
    main/
      index.ts                      # app lifecycle, window + tray orchestration
      windows.ts                    # create tray popover + floating widget windows
      tray.ts                       # system tray icon + menu
      ipc.ts                        # registers IPC handlers, pushes snapshots
      scheduler.ts                  # interval + manual refresh trigger
      refresh.ts                    # orchestrates one refresh cycle
      auth/
        session.ts                  # login window, cookie + org capture, validity
      usage/
        client.ts                   # authenticated fetch from claude.ai
        parser.ts                   # pure: raw response -> UsageSnapshot
        endpoint.ts                 # endpoint URL + request shape (from capture)
      history/
        store.ts                    # append + prune snapshots, return series
      notify/
        notifier.ts                 # threshold check + de-dup + OS notification
      settings/
        store.ts                    # load/save preferences + encrypted session
    preload/
      index.ts                      # contextBridge typed API
    shared/
      types.ts                      # UsageSnapshot, Settings, IPC channel types
    renderer/
      index.html
      main.tsx                      # React entry
      App.tsx                       # routes the 3 views by window role
      styles.css                    # Tailwind entry + design tokens
      lib/
        format.ts                   # countdown + percent formatting (pure)
        ipc.ts                      # typed wrapper over window.api
      components/
        UsageMeter.tsx              # one metric: ring/bar + % + countdown
        HistoryChart.tsx            # 7-day SVG chart
        StaleBadge.tsx
        ReloginPrompt.tsx
      views/
        PanelView.tsx               # tray popover + widget content
        SettingsView.tsx
  tests/
    main/usage/parser.test.ts
    main/history/store.test.ts
    main/notify/notifier.test.ts
    main/settings/store.test.ts
    renderer/lib/format.test.ts
    fixtures/
      usage-response.sample.json    # captured raw response (sanitized)
```

---

## Phase 0: Scaffold

### Task 0: Project scaffold and tooling

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `tailwind.config.js`, `postcss.config.js`, `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/styles.css`, `src/main/index.ts`, `src/preload/index.ts`, `src/shared/types.ts`

- [ ] **Step 1: Initialize package and install deps**

Run from project root:
```bash
npm init -y
npm i -D electron electron-vite electron-builder vite typescript @types/node \
  @vitejs/plugin-react vitest tailwindcss@^3.4 postcss autoprefixer \
  @types/react @types/react-dom
npm i react react-dom
```

- [ ] **Step 2: Write `package.json` scripts and main entry**

Set these fields in `package.json` (merge with generated file):
```json
{
  "name": "claude-usage-monitor",
  "version": "0.1.0",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "dist": "electron-vite build && electron-builder"
  }
}
```

- [ ] **Step 3: Write `electron.vite.config.ts`**

```ts
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/main/index.ts') } } } },
  preload: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/preload/index.ts') } } } },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: { rollupOptions: { input: { index: resolve(__dirname, 'src/renderer/index.html') } } },
    plugins: [react()],
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } }
  }
})
```

- [ ] **Step 4: Write `tsconfig.json` and `tsconfig.node.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src", "tests"]
}
```
`tsconfig.node.json`:
```json
{ "compilerOptions": { "composite": true, "module": "ESNext", "moduleResolution": "Bundler" }, "include": ["electron.vite.config.ts"] }
```

- [ ] **Step 5: Write Tailwind config and PostCSS**

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
}
```
`postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } }
})
```

- [ ] **Step 7: Write minimal renderer files**

`src/renderer/index.html`:
```html
<!doctype html>
<html><head><meta charset="utf-8" /><title>Claude Usage Monitor</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>
```
`src/renderer/styles.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
`src/renderer/main.tsx`:
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
createRoot(document.getElementById('root')!).render(<div className="p-4 text-sm">Claude Usage Monitor</div>)
```

- [ ] **Step 8: Write minimal main + preload + shared types**

`src/shared/types.ts`:
```ts
export interface UsageMetric { usedPct: number; used: number; limit: number; resetsAt: string }
export interface UsageSnapshot { capturedAt: string; session: UsageMetric; weekly: UsageMetric }
export type AppStatus = 'ok' | 'stale' | 'relogin' | 'error'
export interface UsageState { status: AppStatus; snapshot: UsageSnapshot | null; message?: string }
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
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  openLogin: 'auth:openLogin'
} as const
```

`src/main/index.ts` (temporary smoke window, replaced in Phase 7):
```ts
import { app, BrowserWindow } from 'electron'
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 360, height: 480 })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile('out/renderer/index.html')
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
```

`src/preload/index.ts` (filled in Phase 7):
```ts
import { contextBridge } from 'electron'
contextBridge.exposeInMainWorld('api', {})
```

- [ ] **Step 9: Verify dev boot**

Run: `npm run dev`
Expected: an Electron window opens showing "Claude Usage Monitor".

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold electron-vite + react + tailwind + vitest"
```

---

## Phase 1: Usage parser (TDD)

The parser converts a captured raw claude.ai usage response into a `UsageSnapshot`. It is pure and the heart of correctness.

### Task 1: Capture a real usage response fixture

**Files:**
- Create: `tests/fixtures/usage-response.sample.json`, `src/main/usage/endpoint.ts`

- [ ] **Step 1: Capture the request the Usage screen makes**

Manual, do this once. Open the Claude app or claude.ai, open DevTools, go to the Usage settings screen, and in the Network tab find the XHR that returns usage/rate-limit data. Record: the request URL, method, and the JSON response body.

- [ ] **Step 2: Save a sanitized fixture**

Save the response body to `tests/fixtures/usage-response.sample.json`. Redact any account identifiers, keep the structure and numbers. If the real shape differs from the assumed shape below, update the parser in Task 2 to match the real keys — the fixture is the source of truth.

- [ ] **Step 3: Record the endpoint**

`src/main/usage/endpoint.ts`:
```ts
// Captured from the Claude app Usage screen (Task 1). Internal/undocumented.
export const USAGE_URL = 'https://claude.ai/api/organizations/{orgId}/usage'
export const USAGE_METHOD = 'GET' as const
export function buildUsageUrl(orgId: string): string {
  return USAGE_URL.replace('{orgId}', encodeURIComponent(orgId))
}
```

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/usage-response.sample.json src/main/usage/endpoint.ts
git commit -m "test: add captured usage response fixture and endpoint"
```

### Task 2: Parser

**Files:**
- Create: `src/main/usage/parser.ts`, `tests/main/usage/parser.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/main/usage/parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseUsage } from '../../../src/main/usage/parser'

const raw = {
  session: { utilization: 42, used: 42000, limit: 100000, resets_at: '2026-06-19T18:00:00Z' },
  weekly:  { utilization: 73, used: 730000, limit: 1000000, resets_at: '2026-06-23T00:00:00Z' }
}

describe('parseUsage', () => {
  it('maps raw fields into a UsageSnapshot', () => {
    const snap = parseUsage(raw, '2026-06-19T12:00:00Z')
    expect(snap.session.usedPct).toBe(42)
    expect(snap.session.limit).toBe(100000)
    expect(snap.weekly.resetsAt).toBe('2026-06-23T00:00:00Z')
    expect(snap.capturedAt).toBe('2026-06-19T12:00:00Z')
  })
  it('throws a specific error when a field is missing', () => {
    expect(() => parseUsage({ session: {} }, '2026-06-19T12:00:00Z'))
      .toThrowError(/usage parse failed/i)
  })
})
```

> Adjust the `raw` object keys to match the fixture from Task 1 if they differ. Keep both tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/usage/parser.test.ts`
Expected: FAIL, `parseUsage` is not defined.

- [ ] **Step 3: Write minimal implementation**

`src/main/usage/parser.ts`:
```ts
import type { UsageSnapshot, UsageMetric } from '@shared/types'

function metric(node: any, name: string): UsageMetric {
  if (!node || typeof node.utilization !== 'number' || typeof node.limit !== 'number')
    throw new Error(`usage parse failed: missing or invalid "${name}" fields`)
  return {
    usedPct: node.utilization,
    used: Number(node.used ?? 0),
    limit: node.limit,
    resetsAt: String(node.resets_at ?? '')
  }
}

export function parseUsage(raw: any, capturedAt: string): UsageSnapshot {
  return { capturedAt, session: metric(raw?.session, 'session'), weekly: metric(raw?.weekly, 'weekly') }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/usage/parser.test.ts`
Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```bash
git add src/main/usage/parser.ts tests/main/usage/parser.test.ts
git commit -m "feat: usage response parser with loud failure"
```

---

## Phase 2: History store (TDD)

### Task 3: Append and prune snapshots

**Files:**
- Create: `src/main/history/store.ts`, `tests/main/history/store.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/main/history/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { appendSnapshot, pruneOlderThan } from '../../../src/main/history/store'
import type { UsageSnapshot } from '../../../src/shared/types'

function snap(capturedAt: string): UsageSnapshot {
  const m = { usedPct: 1, used: 1, limit: 100, resetsAt: capturedAt }
  return { capturedAt, session: m, weekly: m }
}

describe('history store', () => {
  it('appends to an existing list', () => {
    const list = [snap('2026-06-18T00:00:00Z')]
    const out = appendSnapshot(list, snap('2026-06-19T00:00:00Z'))
    expect(out).toHaveLength(2)
    expect(out[1].capturedAt).toBe('2026-06-19T00:00:00Z')
  })
  it('prunes entries older than the cutoff', () => {
    const now = new Date('2026-06-19T00:00:00Z')
    const list = [snap('2026-06-10T00:00:00Z'), snap('2026-06-18T00:00:00Z')]
    const out = pruneOlderThan(list, now, 7)
    expect(out).toHaveLength(1)
    expect(out[0].capturedAt).toBe('2026-06-18T00:00:00Z')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/history/store.test.ts`
Expected: FAIL, functions not defined.

- [ ] **Step 3: Write minimal implementation**

`src/main/history/store.ts`:
```ts
import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { UsageSnapshot } from '@shared/types'

export function appendSnapshot(list: UsageSnapshot[], snap: UsageSnapshot): UsageSnapshot[] {
  return [...list, snap]
}

export function pruneOlderThan(list: UsageSnapshot[], now: Date, days: number): UsageSnapshot[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return list.filter((s) => new Date(s.capturedAt).getTime() >= cutoff)
}

function file(): string { return join(app.getPath('userData'), 'history.json') }

export async function loadHistory(): Promise<UsageSnapshot[]> {
  try { return JSON.parse(await fs.readFile(file(), 'utf8')) } catch { return [] }
}

export async function saveHistory(list: UsageSnapshot[]): Promise<void> {
  await fs.writeFile(file(), JSON.stringify(list), 'utf8')
}

export async function recordSnapshot(snap: UsageSnapshot): Promise<UsageSnapshot[]> {
  const next = pruneOlderThan(appendSnapshot(await loadHistory(), snap), new Date(), 7)
  await saveHistory(next)
  return next
}
```

> `appendSnapshot` and `pruneOlderThan` are pure and tested. `load/save/recordSnapshot` touch Electron `app` and the filesystem and are exercised in Phase 7, not unit-tested.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/history/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/history/store.ts tests/main/history/store.test.ts
git commit -m "feat: history store with 7-day prune"
```

---

## Phase 3: Notifier (TDD)

### Task 4: Threshold crossing with de-duplication

**Files:**
- Create: `src/main/notify/notifier.ts`, `tests/main/notify/notifier.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/main/notify/notifier.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { evaluateThresholds, type NotifyState } from '../../../src/main/notify/notifier'
import type { UsageSnapshot } from '../../../src/shared/types'

function snap(sessionPct: number, weeklyPct: number): UsageSnapshot {
  return {
    capturedAt: '2026-06-19T12:00:00Z',
    session: { usedPct: sessionPct, used: 0, limit: 100, resetsAt: '' },
    weekly: { usedPct: weeklyPct, used: 0, limit: 100, resetsAt: '' }
  }
}
const cfg = { amber: 70, red: 90 }

describe('evaluateThresholds', () => {
  it('emits a red alert for the session when crossing 90', () => {
    const prev: NotifyState = { session: 'none', weekly: 'none' }
    const { alerts, next } = evaluateThresholds(snap(92, 10), cfg, prev)
    expect(alerts).toEqual([{ metric: 'session', level: 'red', pct: 92 }])
    expect(next.session).toBe('red')
  })
  it('does not re-alert at the same level on the next tick', () => {
    const prev: NotifyState = { session: 'red', weekly: 'none' }
    const { alerts } = evaluateThresholds(snap(93, 10), cfg, prev)
    expect(alerts).toHaveLength(0)
  })
  it('resets to none when usage drops after a window reset', () => {
    const prev: NotifyState = { session: 'red', weekly: 'none' }
    const { next } = evaluateThresholds(snap(5, 10), cfg, prev)
    expect(next.session).toBe('none')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/notify/notifier.test.ts`
Expected: FAIL, `evaluateThresholds` not defined.

- [ ] **Step 3: Write minimal implementation**

`src/main/notify/notifier.ts`:
```ts
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

export function evaluateThresholds(
  snap: UsageSnapshot, cfg: ThresholdCfg, prev: NotifyState
): { alerts: Alert[]; next: NotifyState } {
  const alerts: Alert[] = []
  const next: NotifyState = { ...prev }
  const rank = { none: 0, amber: 1, red: 2 }
  for (const metric of ['session', 'weekly'] as Metric[]) {
    const pct = snap[metric].usedPct
    const lvl = levelFor(pct, cfg)
    if (rank[lvl] > rank[prev[metric]]) alerts.push({ metric, level: lvl as Alert['level'], pct })
    next[metric] = lvl
  }
  return { alerts, next }
}

export function fireAlerts(alerts: Alert[]): void {
  for (const a of alerts) {
    new Notification({
      title: `Claude ${a.metric} usage ${a.level === 'red' ? 'critical' : 'high'}`,
      body: `${a.metric} is at ${Math.round(a.pct)}%`
    }).show()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/notify/notifier.test.ts`
Expected: PASS, all three tests.

- [ ] **Step 5: Commit**

```bash
git add src/main/notify/notifier.ts tests/main/notify/notifier.test.ts
git commit -m "feat: threshold evaluation with de-dup alerts"
```

---

## Phase 4: Settings store (TDD for defaults/merge)

### Task 5: Settings defaults and merge

**Files:**
- Create: `src/main/settings/store.ts`, `tests/main/settings/store.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/main/settings/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings } from '../../../src/main/settings/store'

describe('settings merge', () => {
  it('fills missing fields with defaults', () => {
    const out = mergeSettings({ refreshMinutes: 10 })
    expect(out.refreshMinutes).toBe(10)
    expect(out.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(out.thresholds).toEqual(DEFAULT_SETTINGS.thresholds)
  })
  it('clamps refreshMinutes to a sane minimum', () => {
    const out = mergeSettings({ refreshMinutes: 0 })
    expect(out.refreshMinutes).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/settings/store.test.ts`
Expected: FAIL, exports not defined.

- [ ] **Step 3: Write minimal implementation**

`src/main/settings/store.ts`:
```ts
import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Settings } from '@shared/types'

export const DEFAULT_SETTINGS: Settings = {
  refreshMinutes: 5,
  thresholds: { amber: 70, red: 90 },
  theme: 'system',
  compact: false,
  showWidget: false
}

export function mergeSettings(partial: Partial<Settings>): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...partial,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(partial.thresholds ?? {}) }
  }
  merged.refreshMinutes = Math.max(1, Math.floor(merged.refreshMinutes))
  return merged
}

function settingsFile(): string { return join(app.getPath('userData'), 'settings.json') }
function sessionFile(): string { return join(app.getPath('userData'), 'session.bin') }

export async function loadSettings(): Promise<Settings> {
  try { return mergeSettings(JSON.parse(await fs.readFile(settingsFile(), 'utf8'))) }
  catch { return { ...DEFAULT_SETTINGS } }
}
export async function saveSettings(s: Settings): Promise<void> {
  await fs.writeFile(settingsFile(), JSON.stringify(mergeSettings(s)), 'utf8')
}

export async function saveSession(token: string): Promise<void> {
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(token) : Buffer.from(token, 'utf8')
  await fs.writeFile(sessionFile(), buf)
}
export async function loadSession(): Promise<string | null> {
  try {
    const buf = await fs.readFile(sessionFile())
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8')
  } catch { return null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/settings/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/settings/store.ts tests/main/settings/store.test.ts
git commit -m "feat: settings defaults/merge + encrypted session storage"
```

---

## Phase 5: Auth/session (integration)

### Task 6: Login window, cookie + org capture

**Files:**
- Create: `src/main/auth/session.ts`

- [ ] **Step 1: Implement the session module**

`src/main/auth/session.ts`:
```ts
import { BrowserWindow, session as electronSession } from 'electron'

const PARTITION = 'persist:claude'
const ORIGIN = 'https://claude.ai'

export function claudeSession() { return electronSession.fromPartition(PARTITION) }

export async function getSessionCookie(): Promise<string | null> {
  const cookies = await claudeSession().cookies.get({ url: ORIGIN })
  const key = cookies.find((c) => c.name === 'sessionKey' || c.name.startsWith('__Secure'))
  if (!key) return null
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

export async function getOrgId(): Promise<string | null> {
  // Captured from the same partition: org id is exposed in a cookie or via the
  // bootstrap/account endpoint. Adjust the cookie name to the real one (Task 1).
  const cookies = await claudeSession().cookies.get({ url: ORIGIN })
  const org = cookies.find((c) => c.name === 'lastActiveOrg')
  return org?.value ?? null
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getSessionCookie()) !== null && (await getOrgId()) !== null
}

export function openLoginWindow(): Promise<void> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 480, height: 720, title: 'Sign in to Claude',
      webPreferences: { partition: PARTITION }
    })
    win.loadURL(ORIGIN + '/login')
    const check = setInterval(async () => {
      if (await isLoggedIn()) { clearInterval(check); win.close() }
    }, 1500)
    win.on('closed', () => { clearInterval(check); resolve() })
  })
}
```

> The cookie names (`sessionKey`, `lastActiveOrg`) are best-guess. During Task 1 capture, confirm the real cookie names from DevTools Application tab and correct them here. This is the single place auth knowledge lives.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Fix any import path issues before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/main/auth/session.ts
git commit -m "feat: claude.ai login window + session/org capture"
```

---

## Phase 6: Usage client (integration)

### Task 7: Authenticated fetch

**Files:**
- Create: `src/main/usage/client.ts`

- [ ] **Step 1: Implement the client**

`src/main/usage/client.ts`:
```ts
import { net } from 'electron'
import { buildUsageUrl, USAGE_METHOD } from './endpoint'
import { parseUsage } from './parser'
import { getSessionCookie, getOrgId } from '../auth/session'
import type { UsageSnapshot } from '@shared/types'

export class NotAuthenticatedError extends Error {}

export async function fetchUsage(): Promise<UsageSnapshot> {
  const cookie = await getSessionCookie()
  const orgId = await getOrgId()
  if (!cookie || !orgId) throw new NotAuthenticatedError('no claude.ai session')

  const res = await net.fetch(buildUsageUrl(orgId), {
    method: USAGE_METHOD,
    headers: { cookie, accept: 'application/json' }
  })
  if (res.status === 401 || res.status === 403) throw new NotAuthenticatedError(`auth rejected (${res.status})`)
  if (!res.ok) throw new Error(`usage request failed: ${res.status}`)
  const raw = await res.json()
  return parseUsage(raw, new Date().toISOString())
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/usage/client.ts
git commit -m "feat: authenticated usage client"
```

---

## Phase 7: Main process wiring

### Task 8: Refresh cycle orchestration

**Files:**
- Create: `src/main/refresh.ts`, `src/main/scheduler.ts`

- [ ] **Step 1: Implement the refresh cycle**

`src/main/refresh.ts`:
```ts
import { fetchUsage, NotAuthenticatedError } from './usage/client'
import { recordSnapshot } from './history/store'
import { evaluateThresholds, fireAlerts, type NotifyState } from './notify/notifier'
import { loadSettings } from './settings/store'
import type { UsageState, UsageSnapshot } from '@shared/types'

let lastSnapshot: UsageSnapshot | null = null
let notifyState: NotifyState = { session: 'none', weekly: 'none' }

export function currentSnapshot() { return lastSnapshot }

export async function runRefresh(): Promise<UsageState> {
  try {
    const snap = await fetchUsage()
    lastSnapshot = snap
    await recordSnapshot(snap)
    const settings = await loadSettings()
    const { alerts, next } = evaluateThresholds(snap, settings.thresholds, notifyState)
    notifyState = next
    fireAlerts(alerts)
    return { status: 'ok', snapshot: snap }
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return { status: 'relogin', snapshot: lastSnapshot, message: err.message }
    return { status: lastSnapshot ? 'stale' : 'error', snapshot: lastSnapshot, message: (err as Error).message }
  }
}
```

`src/main/scheduler.ts`:
```ts
type Tick = () => void
let timer: NodeJS.Timeout | null = null

export function startScheduler(minutes: number, onTick: Tick): void {
  stopScheduler()
  timer = setInterval(onTick, Math.max(1, minutes) * 60 * 1000)
}
export function stopScheduler(): void { if (timer) clearInterval(timer); timer = null }
```

- [ ] **Step 2: Commit**

```bash
git add src/main/refresh.ts src/main/scheduler.ts
git commit -m "feat: refresh cycle + scheduler"
```

### Task 9: Windows and tray

**Files:**
- Create: `src/main/windows.ts`, `src/main/tray.ts`

- [ ] **Step 1: Implement windows**

`src/main/windows.ts`:
```ts
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'

const preload = join(__dirname, '../preload/index.js')

function load(win: BrowserWindow, hash: string) {
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  else win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
}

export function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 340, height: 460, show: false, frame: false, resizable: false, skipTaskbar: true,
    webPreferences: { preload, contextIsolation: true }
  })
  win.on('blur', () => win.hide())
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  load(win, 'panel')
  return win
}

export function createWidgetWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 220, height: 140, frame: false, alwaysOnTop: true, resizable: false, skipTaskbar: true,
    webPreferences: { preload, contextIsolation: true }
  })
  load(win, 'widget')
  return win
}
```

`src/main/tray.ts`:
```ts
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'

export function createTray(panel: BrowserWindow, onRefresh: () => void, onQuit: () => void): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Claude Usage Monitor')
  tray.on('click', () => {
    if (panel.isVisible()) { panel.hide(); return }
    const { x, y } = tray.getBounds()
    const { width } = panel.getBounds()
    panel.setPosition(Math.round(x - width / 2), Math.round(y + 8))
    panel.show()
  })
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Refresh now', click: onRefresh },
    { type: 'separator' },
    { label: 'Quit', click: onQuit }
  ]))
  return tray
}
```

> Add a `resources/trayTemplate.png` (16x16 / 32x32). If absent, the empty-image fallback keeps the app running.

- [ ] **Step 2: Commit**

```bash
git add src/main/windows.ts src/main/tray.ts
git commit -m "feat: panel + widget windows and system tray"
```

### Task 10: IPC bridge + preload + main entry

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`, `src/main/index.ts`

- [ ] **Step 1: Implement IPC handlers**

`src/main/ipc.ts`:
```ts
import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/types'
import type { UsageState } from '@shared/types'
import { runRefresh, currentSnapshot } from './refresh'
import { loadSettings, saveSettings } from './settings/store'
import { openLoginWindow } from './auth/session'

type Broadcast = (state: UsageState) => void

export function registerIpc(getWindows: () => BrowserWindow[]): { broadcast: Broadcast; doRefresh: () => Promise<void> } {
  const broadcast: Broadcast = (state) => getWindows().forEach((w) => w.webContents.send(IPC.onState, state))
  const doRefresh = async () => { broadcast(await runRefresh()) }

  ipcMain.handle(IPC.getState, async () => ({ status: 'ok', snapshot: currentSnapshot() }))
  ipcMain.handle(IPC.refresh, doRefresh)
  ipcMain.handle(IPC.getSettings, () => loadSettings())
  ipcMain.handle(IPC.setSettings, (_e, s) => saveSettings(s))
  ipcMain.handle(IPC.openLogin, async () => { await openLoginWindow(); await doRefresh() })

  return { broadcast, doRefresh }
}
```

- [ ] **Step 2: Implement preload**

`src/preload/index.ts`:
```ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { UsageState, Settings } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  getState: (): Promise<UsageState> => ipcRenderer.invoke(IPC.getState),
  refresh: (): Promise<void> => ipcRenderer.invoke(IPC.refresh),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (s: Settings): Promise<void> => ipcRenderer.invoke(IPC.setSettings, s),
  openLogin: (): Promise<void> => ipcRenderer.invoke(IPC.openLogin),
  onState: (cb: (s: UsageState) => void) => {
    const handler = (_e: unknown, s: UsageState) => cb(s)
    ipcRenderer.on(IPC.onState, handler)
    return () => ipcRenderer.removeListener(IPC.onState, handler)
  }
})
```

- [ ] **Step 3: Rewrite main entry to wire everything**

`src/main/index.ts`:
```ts
import { app, BrowserWindow } from 'electron'
import { createPanelWindow, createWidgetWindow } from './windows'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { startScheduler } from './scheduler'
import { loadSettings } from './settings/store'
import { isLoggedIn, openLoginWindow } from './auth/session'

let panel: BrowserWindow, widget: BrowserWindow | null = null, tray: ReturnType<typeof createTray>

app.whenReady().then(async () => {
  panel = createPanelWindow()
  const settings = await loadSettings()
  if (settings.showWidget) widget = createWidgetWindow()

  const windows = () => [panel, widget].filter(Boolean) as BrowserWindow[]
  const { doRefresh } = registerIpc(windows)
  tray = createTray(panel, () => void doRefresh(), () => app.quit())

  if (!(await isLoggedIn())) await openLoginWindow()
  await doRefresh()
  startScheduler(settings.refreshMinutes, () => void doRefresh())
})

app.on('window-all-closed', (e: Electron.Event) => { e.preventDefault() }) // tray app stays alive
```

- [ ] **Step 4: Verify dev boot and a manual refresh**

Run: `npm run dev`
Expected: login window appears on first run; after login, the tray icon toggles a panel; "Refresh now" updates it.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts src/preload/index.ts src/main/index.ts
git commit -m "feat: wire IPC, preload bridge, and app entry"
```

---

## Phase 8: UI to the Apple DESIGN.md

### Task 11: Copy design tokens and format helpers (TDD for format)

**Files:**
- Create: `DESIGN.md` (copied), `src/renderer/lib/format.ts`, `tests/renderer/lib/format.test.ts`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Copy the Apple design system**

Run: `cp ~/.claude/design-md/design-md/Apple/DESIGN.md ./DESIGN.md`
Then translate its color/spacing/typography tokens into `tailwind.config.js` `theme.extend` (colors, fontFamily, borderRadius). Use the DESIGN.md values verbatim.

- [ ] **Step 2: Write the failing test for format helpers**

`tests/renderer/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { countdown, pct } from '../../../src/renderer/lib/format'

describe('format', () => {
  it('formats a countdown as Hh Mm', () => {
    const now = new Date('2026-06-19T12:00:00Z')
    expect(countdown('2026-06-19T14:30:00Z', now)).toBe('2h 30m')
  })
  it('shows reset reached at zero', () => {
    const now = new Date('2026-06-19T15:00:00Z')
    expect(countdown('2026-06-19T14:30:00Z', now)).toBe('resetting…')
  })
  it('rounds percent', () => { expect(pct(42.6)).toBe('43%') })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/renderer/lib/format.test.ts`
Expected: FAIL, helpers not defined.

- [ ] **Step 4: Implement format helpers**

`src/renderer/lib/format.ts`:
```ts
export function pct(n: number): string { return `${Math.round(n)}%` }

export function countdown(resetsAt: string, now: Date = new Date()): string {
  const ms = new Date(resetsAt).getTime() - now.getTime()
  if (!isFinite(ms) || ms <= 0) return 'resetting…'
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/renderer/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md tailwind.config.js src/renderer/lib/format.ts tests/renderer/lib/format.test.ts
git commit -m "feat: apple design tokens + tested format helpers"
```

### Task 12: IPC client wrapper and typed window API

**Files:**
- Create: `src/renderer/lib/ipc.ts`

- [ ] **Step 1: Implement typed wrapper**

`src/renderer/lib/ipc.ts`:
```ts
import type { UsageState, Settings } from '@shared/types'

interface Api {
  getState(): Promise<UsageState>
  refresh(): Promise<void>
  getSettings(): Promise<Settings>
  setSettings(s: Settings): Promise<void>
  openLogin(): Promise<void>
  onState(cb: (s: UsageState) => void): () => void
}
declare global { interface Window { api: Api } }
export const api: Api = window.api
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/lib/ipc.ts
git commit -m "feat: typed renderer IPC wrapper"
```

### Task 13: Presentational components

**Files:**
- Create: `src/renderer/components/UsageMeter.tsx`, `src/renderer/components/HistoryChart.tsx`, `src/renderer/components/StaleBadge.tsx`, `src/renderer/components/ReloginPrompt.tsx`

- [ ] **Step 1: UsageMeter**

`src/renderer/components/UsageMeter.tsx`:
```tsx
import type { UsageMetric } from '@shared/types'
import { pct, countdown } from '../lib/format'

function color(p: number, amber: number, red: number): string {
  if (p >= red) return 'text-red-500 stroke-red-500'
  if (p >= amber) return 'text-amber-500 stroke-amber-500'
  return 'text-emerald-500 stroke-emerald-500'
}

export function UsageMeter({ label, m, amber, red }: { label: string; m: UsageMetric; amber: number; red: number }) {
  const c = color(m.usedPct, amber, red)
  const r = 28, circ = 2 * Math.PI * r
  const dash = circ * Math.min(1, m.usedPct / 100)
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72" className={c}>
        <circle cx="36" cy="36" r={r} className="stroke-black/10 dark:stroke-white/10" strokeWidth="6" fill="none" />
        <circle cx="36" cy="36" r={r} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 36 36)" />
      </svg>
      <div>
        <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
        <div className="text-2xl font-semibold">{pct(m.usedPct)}</div>
        <div className="text-xs opacity-60">resets in {countdown(m.resetsAt)}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: HistoryChart (custom SVG)**

`src/renderer/components/HistoryChart.tsx`:
```tsx
import type { UsageSnapshot } from '@shared/types'

export function HistoryChart({ data }: { data: UsageSnapshot[] }) {
  if (data.length < 2) return <div className="text-xs opacity-50">Collecting history…</div>
  const w = 300, h = 80, max = 100
  const pts = data.map((s, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (s.weekly.usedPct / max) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-emerald-500">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
```

- [ ] **Step 3: StaleBadge and ReloginPrompt**

`src/renderer/components/StaleBadge.tsx`:
```tsx
export function StaleBadge() {
  return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600">stale</span>
}
```
`src/renderer/components/ReloginPrompt.tsx`:
```tsx
import { api } from '../lib/ipc'
export function ReloginPrompt() {
  return (
    <div className="flex flex-col items-center gap-2 p-6 text-center">
      <div className="text-sm opacity-70">Your Claude session expired.</div>
      <button className="rounded-lg bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        onClick={() => api.openLogin()}>Sign in again</button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components
git commit -m "feat: usage meter, history chart, stale + relogin components"
```

### Task 14: Views and App router

**Files:**
- Create: `src/renderer/views/PanelView.tsx`, `src/renderer/views/SettingsView.tsx`, `src/renderer/App.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: PanelView**

`src/renderer/views/PanelView.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { UsageState, UsageSnapshot, Settings } from '@shared/types'
import { api } from '../lib/ipc'
import { UsageMeter } from '../components/UsageMeter'
import { HistoryChart } from '../components/HistoryChart'
import { StaleBadge } from '../components/StaleBadge'
import { ReloginPrompt } from '../components/ReloginPrompt'

export function PanelView() {
  const [state, setState] = useState<UsageState | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [history, setHistory] = useState<UsageSnapshot[]>([])

  useEffect(() => {
    api.getState().then(setState)
    api.getSettings().then(setSettings)
    return api.onState((s) => {
      setState(s)
      if (s.snapshot) setHistory((h) => [...h, s.snapshot as UsageSnapshot].slice(-100))
    })
  }, [])

  if (!state || !settings) return <div className="p-4 text-sm">Loading…</div>
  if (state.status === 'relogin') return <ReloginPrompt />
  const snap = state.snapshot
  if (!snap) return <div className="p-4 text-sm">No data yet.</div>
  const { amber, red } = settings.thresholds

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Claude usage</span>
        <div className="flex items-center gap-2">
          {state.status === 'stale' && <StaleBadge />}
          <button className="text-xs opacity-60 hover:opacity-100" onClick={() => api.refresh()}>Refresh</button>
        </div>
      </div>
      <UsageMeter label="Session" m={snap.session} amber={amber} red={red} />
      <UsageMeter label="Weekly" m={snap.weekly} amber={amber} red={red} />
      <HistoryChart data={history} />
    </div>
  )
}
```

- [ ] **Step 2: SettingsView**

`src/renderer/views/SettingsView.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types'
import { api } from '../lib/ipc'

export function SettingsView() {
  const [s, setS] = useState<Settings | null>(null)
  useEffect(() => { api.getSettings().then(setS) }, [])
  if (!s) return <div className="p-4 text-sm">Loading…</div>
  const save = (next: Settings) => { setS(next); api.setSettings(next) }
  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <label className="flex items-center justify-between">Refresh (min)
        <input type="number" min={1} value={s.refreshMinutes} className="w-16 rounded border px-1"
          onChange={(e) => save({ ...s, refreshMinutes: Number(e.target.value) })} />
      </label>
      <label className="flex items-center justify-between">Amber %
        <input type="number" value={s.thresholds.amber} className="w-16 rounded border px-1"
          onChange={(e) => save({ ...s, thresholds: { ...s.thresholds, amber: Number(e.target.value) } })} />
      </label>
      <label className="flex items-center justify-between">Red %
        <input type="number" value={s.thresholds.red} className="w-16 rounded border px-1"
          onChange={(e) => save({ ...s, thresholds: { ...s.thresholds, red: Number(e.target.value) } })} />
      </label>
      <label className="flex items-center justify-between">Theme
        <select value={s.theme} className="rounded border px-1"
          onChange={(e) => save({ ...s, theme: e.target.value as Settings['theme'] })}>
          <option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option>
        </select>
      </label>
      <label className="flex items-center justify-between">Floating widget
        <input type="checkbox" checked={s.showWidget}
          onChange={(e) => save({ ...s, showWidget: e.target.checked })} />
      </label>
    </div>
  )
}
```

- [ ] **Step 3: App router + entry**

`src/renderer/App.tsx`:
```tsx
import { PanelView } from './views/PanelView'
import { SettingsView } from './views/SettingsView'
export default function App() {
  const route = window.location.hash.replace('#', '') || 'panel'
  if (route === 'settings') return <SettingsView />
  return <PanelView /> // 'panel' and 'widget' share the panel content
}
```
Replace `src/renderer/main.tsx` body render with:
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
```

- [ ] **Step 4: Verify the UI**

Run: `npm run dev`
Expected: panel shows two meters, a refresh button, and a history line once two snapshots exist. Threshold colors change with usage.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/views src/renderer/App.tsx src/renderer/main.tsx
git commit -m "feat: panel and settings views wired to live state"
```

---

## Phase 9: Packaging

### Task 15: electron-builder config

**Files:**
- Create: `electron-builder.yml`

- [ ] **Step 1: Write builder config**

`electron-builder.yml`:
```yaml
appId: com.pujan.claude-usage-monitor
productName: Claude Usage Monitor
directories: { output: dist, buildResources: resources }
files: ['out/**/*', 'package.json']
win: { target: [{ target: nsis }] }
nsis: { oneClick: true, perMachine: false }
```

- [ ] **Step 2: Build a Windows installer**

Run: `npm run dist`
Expected: an installer in `dist/`. Launch it; the app runs from the tray.

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "build: electron-builder windows packaging"
```

---

## Final verification

- [ ] Run the full test suite: `npm run test` — expect parser, history, notifier, settings, and format tests green.
- [ ] Run `npx tsc --noEmit` — expect no type errors.
- [ ] Run `npm run dev`, log in, confirm session + weekly meters match the Claude app's Usage screen, refresh works, threshold colors and a notification fire when you cross a threshold (temporarily lower the red threshold to test).
- [ ] Toggle the floating widget in settings, restart, confirm it appears always-on-top.

---

## Self-Review Notes

- Spec coverage: core display (Tasks 11–14), auto + manual refresh (Tasks 8, 10), 7-day history (Tasks 3, 13), notifications (Task 4 + Task 8 integration), tray + widget (Task 9), Apple DESIGN.md (Task 11), encrypted session (Task 5), error/stale/relogin states (Tasks 7, 8, 13–14). All spec sections map to tasks.
- The usage endpoint and cookie names are captured in Task 1 / corrected in Tasks 6–7 rather than fabricated. The fixture is the source of truth for the parser.
- Type consistency: `UsageSnapshot`, `UsageMetric`, `Settings`, `UsageState`, `IPC` channels are defined once in `src/shared/types.ts` and reused everywhere. The renderer history uses `UsageSnapshot[]` consistently across `PanelView` and `HistoryChart`.
```
