import {resultRedirect} from '@/server/connectResult'
import {getOAuthStates} from '@/server/database'
import {getAppBaseUrl} from '@/server/env'
import {getInstagramService} from '@/server/instagram'
import {logger} from '@/server/log'
import {
  bindingCookie,
  isValidStateFormat,
  randomToken,
  serializeBindingCookie,
  sha256Hex,
  STATE_TTL_SECONDS,
} from '@/server/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Opened as a top-level navigation in the popup. Launches the state exactly once, binds it to this
 * browser with an HttpOnly cookie (only its hash is stored), then redirects to Instagram.
 */
export async function GET(request: Request): Promise<Response> {
  const state = new URL(request.url).searchParams.get('state')
  if (!isValidStateFormat(state)) return resultRedirect(request, {status: 'error', reason: 'invalid_state'})
  try {
    const service = getInstagramService()
    const cookie = bindingCookie(getAppBaseUrl())
    const binding = randomToken()
    const launched = await getOAuthStates().launch(sha256Hex(state), sha256Hex(binding))
    if (!launched) return resultRedirect(request, {status: 'error', reason: 'invalid_state'})

    logger.info('instagram_connect_launched', {clientId: launched.clientId})
    return new Response(null, {
      status: 302,
      headers: {
        Location: service.getAuthorizeUrl(state),
        'Set-Cookie': serializeBindingCookie(cookie, binding, STATE_TTL_SECONDS),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error('instagram_connect_authorize_failed', {error})
    const reason = error instanceof Error && 'code' in error && String(error.code).endsWith('not_configured')
      ? 'not_configured'
      : 'server_error'
    return resultRedirect(request, {status: 'error', reason})
  }
}
