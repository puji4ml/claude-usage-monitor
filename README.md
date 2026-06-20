# Claude Usage Monitor

A small desktop app (Electron + React) that shows your Claude usage at a glance:
the current 5-hour session window and the 7-day weekly window, with reset
countdowns, a 7-day history chart, threshold notifications, and a glass UI that
lives in the system tray.

It reads the same data the Claude app's Usage screen shows, by reusing your
authenticated claude.ai session (you sign in once through an embedded window).

## How it works

- The main process owns the claude.ai session, all network calls, scheduling,
  storage, and notifications. The renderer only displays a normalized snapshot
  received over a typed IPC bridge — it never touches the network or cookies.
- Usage comes from an internal claude.ai endpoint
  (`/api/organizations/{org}/usage`). The response (`five_hour` / `seven_day`
  utilization + reset times) is parsed into a small `UsageSnapshot`.

> Note: this uses an internal, undocumented endpoint. It can change at any time.
> Personal use only; not affiliated with Anthropic.

## Develop

```bash
npm install
npm run dev      # launch the app (sign in when the window appears)
npm test         # unit tests (parser, history, thresholds, settings, format)
npm run typecheck
npm run build
npm run dist     # package a Windows installer
```

## Stack

Electron, TypeScript, electron-vite, React, Vite, Tailwind CSS, Vitest,
electron-builder.
