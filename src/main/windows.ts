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

const glass =
  process.platform === 'win32'
    ? { backgroundMaterial: 'acrylic' as const, backgroundColor: '#00000000' }
    : { vibrancy: 'under-window' as const, transparent: true, backgroundColor: '#00000000' }

export function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 360,
    height: 430,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    roundedCorners: true,
    ...glass,
    webPreferences: { preload, contextIsolation: true }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  load(win, 'panel')
  return win
}

export function createWidgetWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 230,
    height: 150,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    roundedCorners: true,
    ...glass,
    webPreferences: { preload, contextIsolation: true }
  })
  load(win, 'widget')
  return win
}
