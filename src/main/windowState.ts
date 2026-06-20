import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowState {
  panel?: Bounds
  widget?: Bounds
}

function file(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

let cache: WindowState | null = null

export async function loadWindowState(): Promise<WindowState> {
  if (cache) return cache
  try {
    cache = JSON.parse(await fs.readFile(file(), 'utf8')) as WindowState
  } catch {
    cache = {}
  }
  return cache
}

export async function saveBounds(key: keyof WindowState, bounds: Bounds): Promise<void> {
  const state = await loadWindowState()
  state[key] = bounds
  cache = state
  try {
    await fs.writeFile(file(), JSON.stringify(state), 'utf8')
  } catch (err) {
    console.error('[windowState] save failed:', err)
  }
}
