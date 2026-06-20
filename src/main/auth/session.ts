import { BrowserWindow, session as electronSession } from 'electron'

const PARTITION = 'persist:claude'
const ORIGIN = 'https://claude.ai'

// Google/Apple OAuth reject embedded browsers that advertise an "Electron"
// user-agent ("this browser may not be secure"), which silently breaks sign-in
// and bounces the user back to the login screen. Present a stock Chrome UA so
// the identity providers allow the OAuth flow to complete.
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export function claudeSession() {
  const s = electronSession.fromPartition(PARTITION)
  s.setUserAgent(CHROME_UA)
  return s
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

export async function openLoginWindow(): Promise<void> {
  // We only open this window when the current session is invalid (startup with
  // no/expired cookies, or a 401/403 re-login). Clear stale storage FIRST and
  // await it, so the immediate isLoggedIn() check can't see expired cookies and
  // close the window before the user has a chance to actually sign in.
  const sess = claudeSession()
  try {
    await sess.clearStorageData({ storages: ['cookies'] })
  } catch (err) {
    console.error('[auth] failed to clear cookies:', err)
  }

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
    win.webContents.setUserAgent(CHROME_UA)
    // Real sign-in browser: claude.ai delegates to third-party identity
    // providers (Google/Apple), so allow OAuth popups and cross-origin nav.
    // The popup must share the persistent partition so cookies set during the
    // OAuth exchange land where the app reads them.
    win.webContents.setWindowOpenHandler(() => ({
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false }
      }
    }))
    // Apply the Chrome UA to OAuth popups as well.
    win.webContents.on('did-create-window', (child) => {
      child.webContents.setUserAgent(CHROME_UA)
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.loadURL(ORIGIN + '/login', { userAgent: CHROME_UA })
    win.focus()

    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      clearInterval(check)
      if (!win.isDestroyed()) win.close()
    }
    const check = setInterval(async () => {
      if (await isLoggedIn()) finish()
    }, 1500)
    // Re-check immediately whenever the embedded browser navigates (e.g. the
    // post-OAuth redirect back to claude.ai) instead of only on the interval.
    win.webContents.on('did-navigate', async () => {
      if (await isLoggedIn()) finish()
    })
    win.on('closed', () => {
      done = true
      clearInterval(check)
      resolve()
    })
  })
}
