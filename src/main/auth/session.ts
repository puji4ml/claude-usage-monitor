import { BrowserWindow, session as electronSession } from 'electron'

const PARTITION = 'persist:claude'
const ORIGIN = 'https://claude.ai'

export function claudeSession() {
  return electronSession.fromPartition(PARTITION)
}

export async function getSessionCookie(): Promise<string | null> {
  const cookies = await claudeSession().cookies.get({ url: ORIGIN })
  const key = cookies.find((c) => c.name === 'sessionKey' || c.name.startsWith('__Secure'))
  if (!key) return null
  return cookies.map((c) => c.name + '=' + c.value).join('; ')
}

export async function getOrgId(): Promise<string | null> {
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
      width: 520,
      height: 740,
      title: 'Sign in to Claude',
      autoHideMenuBar: true,
      center: true,
      show: true,
      alwaysOnTop: true,
      webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false }
    })
    // Real sign-in browser: claude.ai delegates to third-party identity
    // providers (Google/Apple), so allow OAuth popups and cross-origin nav.
    win.webContents.setWindowOpenHandler(() => ({ action: 'allow' }))
    win.setAlwaysOnTop(true, 'screen-saver')
    win.loadURL(ORIGIN + '/login')
    win.focus()
    const check = setInterval(async () => {
      if (await isLoggedIn()) {
        clearInterval(check)
        if (!win.isDestroyed()) win.close()
      }
    }, 1500)
    win.on('closed', () => {
      clearInterval(check)
      resolve()
    })
  })
}
