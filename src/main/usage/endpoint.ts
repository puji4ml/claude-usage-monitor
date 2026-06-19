// Captured from the Claude app Usage screen. Internal/undocumented endpoint.
// If the real URL or method differs, correct it here. This is the single place
// the usage endpoint is defined.
export const USAGE_URL = 'https://claude.ai/api/organizations/{orgId}/usage'
export const USAGE_METHOD = 'GET' as const

export function buildUsageUrl(orgId: string): string {
  return USAGE_URL.replace('{orgId}', encodeURIComponent(orgId))
}
