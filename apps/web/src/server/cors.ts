import 'server-only'
import {getAllowedOrigins} from './env'

const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS = 'Authorization, Content-Type'

/**
 * CORS for the Sanity app. The Origin is reflected only when it is listed in ALLOWED_APP_ORIGINS.
 * No credentials: the app authenticates with a bearer token, not cookies.
 */
export function corsHeaders(request: Request): Headers {
  const headers = new Headers({Vary: 'Origin'})
  const origin = request.headers.get('origin')
  if (origin && getAllowedOrigins().has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
    headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
    headers.set('Access-Control-Max-Age', '600')
  }
  return headers
}

/** OPTIONS preflight. Disallowed origins get a 204 without Allow-Origin, which the browser rejects. */
export function preflight(request: Request): Response {
  return new Response(null, {status: 204, headers: corsHeaders(request)})
}
