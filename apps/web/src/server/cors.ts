import 'server-only'
import {corsHeadersFor} from './corsPolicy'
import {getAllowedOrigins} from './env'
import {logger} from './log'

/** Origins already reported as rejected, so a misconfiguration is logged once, not on every request. */
const reportedOrigins = new Set<string>()

/**
 * CORS for the Sanity app. The Origin is reflected only when it is listed in ALLOWED_APP_ORIGINS.
 * No credentials: the app authenticates with a bearer token, not cookies.
 */
export function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('origin')
  const allowed = getAllowedOrigins()
  if (origin && !allowed.has(origin) && !reportedOrigins.has(origin)) {
    reportedOrigins.add(origin)
    // A deployed Sanity app runs on its own https://<appHost>.sanity.studio origin; if it is missing
    // here, every browser call fails as "backend unreachable".
    logger.warn('cors_origin_rejected', {origin, hint: 'Add this origin to ALLOWED_APP_ORIGINS if it is the Sanity app.'})
  }
  return corsHeadersFor(origin, allowed)
}

/** OPTIONS preflight. Disallowed origins get a 204 without Allow-Origin, which the browser rejects. */
export function preflight(request: Request): Response {
  return new Response(null, {status: 204, headers: corsHeaders(request)})
}
