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

// Transparent floating window: the rounded glass card is drawn in CSS, so the
// corners reveal the desktop. This works regardless of the Windows 11
// "transparency effects" setting (unlike acrylic/mica, which render flat gray
// when that setting is off).
export function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 360,
    height: 430,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    skipTaskbar: false,
    alwaysOnTop: false,
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
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { preload, contextIsolation: true }
  })
  load(win, 'widget')
  return win
}
