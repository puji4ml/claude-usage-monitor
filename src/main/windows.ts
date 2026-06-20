import { BrowserWindow, shell } from 'electron'
import { join } from 'path'

const preload = join(__dirname, '../preload/index.js')

function load(win: BrowserWindow, hash: string): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL + '#' + hash)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

export function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 340,
    height: 460,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { preload, contextIsolation: true }
  })
  win.on('blur', () => win.hide())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  load(win, 'panel')
  return win
}

export function createWidgetWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 220,
    height: 140,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { preload, contextIsolation: true }
  })
  load(win, 'widget')
  return win
}
