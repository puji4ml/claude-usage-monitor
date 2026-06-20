import { BrowserWindow, shell } from 'electron'
import { join } from 'path'

const preload = join(__dirname, '../preload/index.js')

// Window sizing. The custom resize grip (renderer) and the reset action both
// clamp to these. Defaults match the original fixed sizes.
export const PANEL_DEFAULT = { width: 360, height: 430 }
export const WIDGET_DEFAULT = { width: 300, height: 420 }
export const MIN_SIZE = { width: 240, height: 220 }

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
    width: PANEL_DEFAULT.width,
    height: PANEL_DEFAULT.height,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // Resizing is driven by a custom grip via setContentSize (transparent
    // frameless windows resize poorly from OS edges), and the window is moved
    // by dragging its header (CSS -webkit-app-region: drag).
    resizable: false,
    movable: true,
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
    width: WIDGET_DEFAULT.width,
    height: WIDGET_DEFAULT.height,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    // The floating widget stays on top of other apps so usage is always visible.
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    webPreferences: { preload, contextIsolation: true }
  })
  win.setAlwaysOnTop(true, 'floating')
  load(win, 'widget')
  return win
}
