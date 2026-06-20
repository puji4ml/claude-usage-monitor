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
  // Org id is exposed in a cookie on claude.ai. Confirm the real cookie name
  // during the Task 1 capture and correct it here if needed.
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
      width: 480,
      height: 720,
      title: 'Sign in to Claude',
      webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false }
    })
    // The login window holds the real claude.ai session partition. Keep it
    // locked to claude.ai: deny popups and block off-origin navigation so the
    // session cookies cannot be carried to an arbitrary origin.
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith(ORIGIN + '/')) e.preventDefault()
    })
    win.loadURL(ORIGIN + '/login')
    const check = setInterval(async () => {
      if (await isLoggedIn()) {
        clearInterval(check)
        win.close()
      }
    }, 1500)
    win.on('closed', () => {
      clearInterval(check)
      resolve()
    })
  })
}
