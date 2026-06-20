import { net } from 'electron'
import { buildUsageUrl, USAGE_METHOD } from './endpoint'
import { parseUsage } from './parser'
import { getSessionCookie, getOrgId } from '../auth/session'
import type { UsageSnapshot } from '@shared/types'

export class NotAuthenticatedError extends Error {}

export async function fetchUsage(): Promise<UsageSnapshot> {
  const cookie = await getSessionCookie()
  const orgId = await getOrgId()
  if (!cookie || !orgId) throw new NotAuthenticatedError('no claude.ai session')

  const res = await net.fetch(buildUsageUrl(orgId), {
    method: USAGE_METHOD,
    headers: {
      cookie,
      accept: '*/*',
      // claude.ai gates its internal API on this client header.
      'anthropic-client-platform': 'web_claude_ai'
    }
  })
  if (res.status === 401 || res.status === 403) {
    throw new NotAuthenticatedError('auth rejected (' + res.status + ')')
  }
  if (!res.ok) throw new Error('usage request failed: ' + res.status)
  const raw = await res.json()
  return parseUsage(raw, new Date().toISOString())
}
