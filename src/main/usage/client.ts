import { net } from 'electron'
import { buildUsageUrl, USAGE_METHOD } from './endpoint'
import { parseUsage } from './parser'
import { getOrgId, isLoggedIn, claudeSession } from '../auth/session'
import type { UsageSnapshot } from '@shared/types'

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export class NotAuthenticatedError extends Error {}

interface RawResponse {
  status: number
  body: string
}

// net.fetch follows the Fetch spec and silently drops "forbidden" headers
// (Referer, Origin, Cookie, User-Agent), and it uses the default session which
// has none of the claude.ai cookies. The usage endpoint needs all of those, so
// use the lower-level net.request bound to the claude session partition
// (useSessionCookies sends the real cookie jar) with the headers set explicitly.
function request(url: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = net.request({
      method: USAGE_METHOD,
      url,
      session: claudeSession(),
      useSessionCookies: true
    })
    req.setHeader('accept', '*/*')
    // claude.ai gates its internal API on this client header.
    req.setHeader('anthropic-client-platform', 'web_claude_ai')
    // The usage endpoint enforces a CSRF check on Referer: without this exact
    // header it returns 403 even with valid session cookies.
    req.setHeader('Referer', 'https://claude.ai/settings/usage')
    req.setHeader('Origin', 'https://claude.ai')
    req.setHeader('User-Agent', CHROME_UA)
    req.on('response', (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
      )
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

export async function fetchUsage(): Promise<UsageSnapshot> {
  const orgId = await getOrgId()
  if (!orgId || !(await isLoggedIn())) throw new NotAuthenticatedError('no claude.ai session')

  const url = buildUsageUrl(orgId)
  const res = await request(url)
  if (res.status === 401 || res.status === 403) {
    throw new NotAuthenticatedError('auth rejected (' + res.status + ')')
  }
  if (res.status < 200 || res.status >= 300) {
    console.error('[usage] request failed ' + res.status + ': ' + res.body.slice(0, 300))
    throw new Error('usage request failed: ' + res.status)
  }
  return parseUsage(JSON.parse(res.body), new Date().toISOString())
}
