# Claude Usage Monitor — Design

Date: 2026-06-19
Author: Pujan Patel
Status: Approved (design), pending implementation plan

## Purpose

A personal Electron desktop app that mirrors what the Claude app's Usage screen
shows: current session usage and weekly usage, percent used, time to reset, and
reset timestamps. Built from scratch, inspired by SlavomirDurej/claude-usage-widget.

Personal use only. Windows 11 primary, but the stack stays cross-platform.

## Non-goals (v1)

- No Anthropic API billing tracking. The user does not use the API.
- No multi-currency or dollar cost. The Usage screen reports percentages and
  resets, not money.
- No end-to-end browser automation in tests.
- No reading of local Claude Code JSONL logs. Data comes from the claude.ai
  session, matching what the Claude app itself displays.

## v1 scope

- Core usage display: session and weekly progress, percent used, countdown to
  reset, reset timestamp, color thresholds (green / amber / red).
- Auto-refresh on an interval plus a manual refresh button.
- 7-day local usage history with a chart.
- Desktop notifications when usage crosses a threshold.
- Two form factors: a system tray icon and an optional always-on-top floating
  widget. Both share one component set.

## Stack

- Electron, TypeScript across both processes.
- Main process: app lifecycle, tray, windows, scheduler, secure storage,
  notifications, and all network calls to claude.ai.
- Renderer: React + Vite + Tailwind, styled from the Apple DESIGN.md design
  tokens. The renderer renders only. It never touches the network or the session
  cookie.
- Packaging: electron-builder.
- Charting: lightweight (custom SVG or uPlot). No heavy chart dependency.

## Architecture

Two-process split. The session cookie lives in the main process and the
encrypted store, never exposed to renderer code. The renderer receives a
normalized `UsageSnapshot` over IPC and displays it.

### Getting the data

The Claude app Usage screen is powered by an internal claude.ai endpoint. There
is no public API. The approach matches the reference repo:

1. A login window loads claude.ai in a persistent Electron session partition.
   The user logs in once.
2. After authentication, the app captures the session cookie and organization id
   from that partition.
3. The usage client, in the main process, calls the claude.ai usage endpoint
   using that persistent session.
4. The parser normalizes the raw response into a `UsageSnapshot`.
5. The session persists across restarts. On expiry, the UI shows a re-login state
   and reopens the login window.

Caveat: the endpoint is internal and undocumented. Anthropic can change its shape
and break parsing. All of it is isolated behind the usage client and a single
parser module, so a break is a one-file fix. The parser fails loudly with a
specific message rather than displaying wrong numbers.

## Components

Each component has one purpose, a defined interface, and is testable in isolation.

- `auth/session` — login window, cookie and org capture, validity check. Depends
  on the Electron session partition.
- `usage/client` — performs the authenticated fetch. Depends on `auth/session`.
- `usage/parser` — pure function, raw response into `UsageSnapshot`. No I/O.
  Fully unit-tested against saved fixtures.
- `history/store` — appends each snapshot to a local file, prunes to 7 days,
  returns the series for the chart. Pure logic over a file. Unit-tested.
- `scheduler` — fires a refresh every N minutes, supports manual trigger.
- `notifier` — fires an OS notification when a threshold is crossed, with
  de-duplication per threshold per window so it does not nag every tick.
- `settings/store` — refresh interval, thresholds, theme, which windows are
  shown. Session encrypted at rest via Electron safeStorage. Preferences in plain
  JSON.
- `renderer` — tray popover view, floating widget view, settings view. Shared
  component set.

## Data model

```
UsageSnapshot {
  capturedAt: ISO timestamp
  session: { usedPct, used, limit, resetsAt }
  weekly:  { usedPct, used, limit, resetsAt }
}
```

History is an append-only list of `UsageSnapshot`, pruned to the last 7 days.

## Data flow

Scheduler tick or manual refresh, then `usage/client` fetch, then `usage/parser`
produces a `UsageSnapshot`. The snapshot goes three places:

1. Pushed to the renderer over IPC for display.
2. Appended to `history/store`.
3. Checked against thresholds by `notifier`.

On any failure, the last good snapshot stays on screen with a stale marker.

## UI

Tray popover and floating widget share one component set, built to the Apple
DESIGN.md tokens.

- Session and weekly each get a progress indicator (ring or bar), percent used, a
  live countdown to reset, and the reset timestamp.
- Color follows thresholds: green, amber, red.
- A 7-day view shows a clean area or bar chart of usage.
- Settings sheet: interval, thresholds, theme (system / dark / light), compact
  mode, toggle the floating widget.

At the start of the UI phase, run
`cp ~/.claude/design-md/design-md/Apple/DESIGN.md ./DESIGN.md` and drive tokens
from it.

## Error handling

- Session expired: reopen login window, show re-login state.
- Network error: keep the last snapshot, mark it stale.
- Parser mismatch: surface a specific error, do not guess values.
- Notifications de-duplicate per threshold per window: one alert, not a stream.

## Testing

- Unit tests on pure pieces: parser (fixtures into snapshots), history prune
  logic, threshold and de-dup logic.
- Auth and network layers mocked at the client boundary.
- No brittle end-to-end browser automation in v1.

## Risks

- Internal endpoint shape change breaks parsing. Mitigated by single-file
  isolation and loud failure.
- Session expiry or cookie rotation. Mitigated by persistent partition and a
  clear re-login flow.
- Electron memory footprint (~150MB). Accepted for build velocity and the
  embedded-browser login it makes trivial.
