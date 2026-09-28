import {asObject, readNumber, readOptionalString, readString, requestJson} from './client'
import {InstagramApiError} from './errors'
import {
  GRAPH_BASE_URL,
  INSTAGRAM_SCOPES,
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  type InstagramAccount,
  type InstagramAppConfig,
  type LongLivedToken,
  type ShortLivedToken,
} from './types'

/** Instagram Login authorize URL (Business Login for Instagram). */
export function buildAuthorizeUrl(config: Pick<InstagramAppConfig, 'appId' | 'redirectUri'>, state: string): string {
  const url = new URL(OAUTH_AUTHORIZE_URL)
  url.searchParams.set('client_id', config.appId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', INSTAGRAM_SCOPES.join(','))
  url.searchParams.set('state', state)
  return url.toString()
}

/** Instagram appends `#_` to the code in the redirect; strip it. */
export function normalizeAuthorizationCode(code: string): string {
  return code.replace(/#_$/, '').trim()
}

function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

/** POST api.instagram.com/oauth/access_token. Handles both `{access_token,…}` and `{data:[{…}]}` shapes. */
export async function exchangeCodeForShortLivedToken(config: InstagramAppConfig, code: string): Promise<ShortLivedToken> {
  const body = await requestJson({
    method: 'POST',
    url: OAUTH_TOKEN_URL,
    form: {
      client_id: config.appId,
      client_secret: config.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
      code: normalizeAuthorizationCode(code),
    },
  })
  const root = asObject(body)
  let payload: Record<string, unknown> = root
  if (Array.isArray(root['data'])) {
    const first: unknown = root['data'][0]
    payload = asObject(first)
  }
  return {
    accessToken: readString(payload, 'access_token'),
    userId: readString(payload, 'user_id'),
    permissions: parsePermissions(payload['permissions']),
  }
}

function parseLongLivedToken(body: unknown): LongLivedToken {
  const obj = asObject(body)
  const expiresIn = readNumber(obj, 'expires_in')
  return {
    accessToken: readString(obj, 'access_token'),
    tokenType: readOptionalString(obj, 'token_type') ?? 'bearer',
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  }
}

/**
 * GET graph.instagram.com/access_token?grant_type=ig_exchange_token. Meta documents the token as a
 * query parameter here; the URL is never logged.
 */
export async function exchangeForLongLivedToken(
  config: Pick<InstagramAppConfig, 'appSecret'>,
  shortLivedToken: string,
): Promise<LongLivedToken> {
  const body = await requestJson({
    method: 'GET',
    url: `${GRAPH_BASE_URL}/access_token`,
    query: {grant_type: 'ig_exchange_token', client_secret: config.appSecret, access_token: shortLivedToken},
  })
  return parseLongLivedToken(body)
}

/** Refreshes a long-lived token (must be at least 24 hours old and not expired). */
export async function refreshToken(accessToken: string): Promise<LongLivedToken> {
  const body = await requestJson({
    method: 'GET',
    url: `${GRAPH_BASE_URL}/refresh_access_token`,
    query: {grant_type: 'ig_refresh_token', access_token: accessToken},
  })
  return parseLongLivedToken(body)
}

export async function getAccount(accessToken: string): Promise<InstagramAccount> {
  const body = await requestJson({
    method: 'GET',
    url: '/me',
    accessToken,
    query: {fields: 'user_id,username,account_type,profile_picture_url'},
  })
  const obj = asObject(body)
  const userId = readOptionalString(obj, 'user_id') ?? readOptionalString(obj, 'id')
  if (!userId) {
    throw new InstagramApiError({code: 'meta_api_error', message: 'Instagram profile has no user ID.', retryable: false})
  }
  return {
    userId,
    username: readString(obj, 'username'),
    accountType: readOptionalString(obj, 'account_type') ?? 'UNKNOWN',
    profilePictureUrl: readOptionalString(obj, 'profile_picture_url'),
  }
}
