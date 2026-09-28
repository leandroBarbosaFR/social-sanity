import {
  InstagramApiError,
  isProfessionalAccountType,
  MOCK_ACCESS_TOKEN,
  MOCK_ID_PREFIX,
  type ConnectedAccount,
} from '@social-studio/instagram'
import type {InstagramConnectionSummary} from '@social-studio/shared'
import {getClientDocs, setInstagramSummary} from '@/server/clients'
import {resultRedirect} from '@/server/connectResult'
import {getOAuthStates, getSocialAccounts} from '@/server/database'
import {getAppBaseUrl} from '@/server/env'
import {ApiError} from '@/server/errors'
import {getInstagramService} from '@/server/instagram'
import {logger} from '@/server/log'
import {
  bindingCookie,
  hashesEqual,
  isValidStateFormat,
  readCookie,
  serializeBindingCookie,
  sha256Hex,
  type ConnectResultReason,
} from '@/server/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/
const MOCK_TOKEN_TTL_S = 60 * 24 * 60 * 60

function mockConnection(clientId: string): ConnectedAccount {
  const short = clientId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toLowerCase() || 'client'
  return {
    account: {
      userId: `${MOCK_ID_PREFIX}${short}`,
      username: `${MOCK_ID_PREFIX}${short}`,
      accountType: 'BUSINESS',
      profilePictureUrl: null,
    },
    token: {
      accessToken: MOCK_ACCESS_TOKEN,
      tokenType: 'bearer',
      expiresIn: MOCK_TOKEN_TTL_S,
      expiresAt: new Date(Date.now() + MOCK_TOKEN_TTL_S * 1000),
    },
    scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
  }
}

class ConnectError extends Error {
  constructor(readonly reason: ConnectResultReason) {
    super(reason)
  }
}

/** Instagram redirects here with ?code&state (or ?error…). */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  let clearCookie = ''
  try {
    const cookie = bindingCookie(getAppBaseUrl())
    clearCookie = serializeBindingCookie(cookie, '', 0)

    const state = params.get('state')
    if (!isValidStateFormat(state)) throw new ConnectError('invalid_state')
    const consumed = await getOAuthStates().consume(sha256Hex(state))
    if (!consumed) throw new ConnectError('invalid_state')

    // CSRF / login-CSRF: the callback must arrive in the same browser that launched the state.
    const binding = readCookie(request, cookie.name)
    if (!binding || !consumed.browserBindingHash || !hashesEqual(sha256Hex(binding), consumed.browserBindingHash)) {
      logger.warn('instagram_connect_binding_mismatch', {clientId: consumed.clientId})
      throw new ConnectError('csrf')
    }
    if (params.get('error')) {
      logger.info('instagram_connect_cancelled', {clientId: consumed.clientId, errorReason: params.get('error_reason')})
      throw new ConnectError('cancelled')
    }
    const code = params.get('code')
    if (!code) throw new ConnectError('meta_error')

    const service = getInstagramService()
    const repo = getSocialAccounts()
    const clientId = consumed.clientId
    const docs = await getClientDocs(clientId)
    if (!docs.published && !docs.draft) throw new ConnectError('client_missing')

    let connected: ConnectedAccount
    try {
      connected = service.mode === 'mock' ? mockConnection(clientId) : await service.connectAccount(code)
    } catch (error) {
      logger.error('instagram_connect_exchange_failed', {clientId, error})
      throw new ConnectError('meta_error')
    }
    const {account, token, scopes} = connected
    if (!isProfessionalAccountType(account.accountType)) {
      logger.info('instagram_connect_not_professional', {clientId, accountType: account.accountType})
      throw new ConnectError('not_professional')
    }

    const saved = await repo.upsertConnection({
      organizationId: consumed.organizationId,
      clientId,
      provider: 'instagram',
      providerAccountId: account.userId,
      username: account.username,
      accountType: account.accountType,
      accessToken: token.accessToken,
      tokenExpiresAt: token.expiresAt,
      scopes,
    })
    const summary: InstagramConnectionSummary = {
      socialAccountId: saved.id,
      providerAccountId: account.userId,
      username: account.username,
      accountType: account.accountType,
      status: 'connected',
      connectedAt: saved.updatedAt,
      tokenExpiresAt: saved.tokenExpiresAt,
      mode: service.mode,
    }
    await setInstagramSummary(clientId, summary)
    logger.info('instagram_connected', {clientId, socialAccountId: saved.id, mode: service.mode})

    const username = USERNAME_PATTERN.test(account.username) ? account.username : 'account'
    return resultRedirect(request, {status: 'connected', username}, {'Set-Cookie': clearCookie})
  } catch (error) {
    let reason: ConnectResultReason = 'server_error'
    if (error instanceof ConnectError) reason = error.reason
    else if (error instanceof ApiError && error.code.endsWith('not_configured')) reason = 'not_configured'
    else if (error instanceof InstagramApiError) reason = 'meta_error'
    if (!(error instanceof ConnectError)) logger.error('instagram_connect_failed', {error})
    return resultRedirect(request, {status: 'error', reason}, clearCookie ? {'Set-Cookie': clearCookie} : {})
  }
}
