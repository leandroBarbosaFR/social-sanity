/**
 * CORS policy for the Sanity app → backend calls. Pure functions (no env, no Next.js) so they can be
 * unit tested; `cors.ts` wires them to the request and ALLOWED_APP_ORIGINS.
 *
 * The app authenticates with a bearer token, never cookies, so responses never carry
 * Access-Control-Allow-Credentials, and a wildcard is never used: only exact configured origins are
 * reflected.
 */

export const ALLOWED_METHODS = 'GET, POST, OPTIONS'
export const ALLOWED_HEADERS = 'Authorization, Content-Type'
export const PREFLIGHT_MAX_AGE_SECONDS = '600'

/**
 * Parses a comma-separated origin list. Entries are trimmed and normalised to `scheme://host[:port]`
 * (a trailing slash or path is dropped). Wildcards and anything that is not an http(s) URL are
 * ignored rather than trusted.
 */
export function parseAllowedOrigins(raw: string | undefined): ReadonlySet<string> {
  const origins = new Set<string>()
  for (const entry of (raw ?? '').split(',')) {
    const value = entry.trim()
    if (!value || value.includes('*')) continue
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' || url.protocol === 'http:') origins.add(url.origin)
    } catch {
      // Ignore malformed entries.
    }
  }
  return origins
}

/** Response headers for a request from `origin`. Allow-* headers only when the origin is allowed. */
export function corsHeadersFor(origin: string | null, allowed: ReadonlySet<string>): Headers {
  const headers = new Headers({Vary: 'Origin'})
  if (origin && allowed.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
    headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
    headers.set('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_SECONDS)
  }
  return headers
}
