import {PUBLISHING_ERRORS, type PublishingErrorCode} from '@social-studio/shared'

export interface InstagramApiErrorOptions {
  code: PublishingErrorCode
  message: string
  retryable?: boolean
  /** Meta error code, optionally with subcode: `190` or `190/463`. */
  providerCode?: string
  httpStatus?: number
  cause?: unknown
}

/** Every failure from this package is an InstagramApiError carrying a PublishingErrorCode. */
export class InstagramApiError extends Error {
  readonly code: PublishingErrorCode
  readonly retryable: boolean
  readonly providerCode: string | undefined
  readonly httpStatus: number | undefined

  constructor(options: InstagramApiErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : {cause: options.cause})
    this.name = 'InstagramApiError'
    this.code = options.code
    this.retryable = options.retryable ?? PUBLISHING_ERRORS[options.code].retryable
    this.providerCode = options.providerCode
    this.httpStatus = options.httpStatus
  }
}

export function isInstagramApiError(value: unknown): value is InstagramApiError {
  return value instanceof InstagramApiError
}

interface MetaErrorPayload {
  message: string | null
  type: string | null
  code: number | null
  subcode: number | null
  userMessage: string | null
  isTransient: boolean
  fbtraceId: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Reads `{error: {message, type, code, error_subcode, fbtrace_id}}`. Also handles OAuth-style `{error_type, code, error_message}`. */
export function parseMetaError(body: unknown): MetaErrorPayload | null {
  const root = asRecord(body)
  if (!root) return null
  const error = asRecord(root['error'])
  if (error) {
    return {
      message: asString(error['message']),
      type: asString(error['type']),
      code: asNumber(error['code']),
      subcode: asNumber(error['error_subcode']),
      userMessage: asString(error['error_user_msg']),
      isTransient: error['is_transient'] === true,
      fbtraceId: asString(error['fbtrace_id']),
    }
  }
  // api.instagram.com/oauth/access_token errors: {error_type, code, error_message}
  if ('error_type' in root || 'error_message' in root) {
    return {
      message: asString(root['error_message']),
      type: asString(root['error_type']),
      code: asNumber(root['code']),
      subcode: null,
      userMessage: null,
      isTransient: false,
      fbtraceId: null,
    }
  }
  return null
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613])
/**
 * Media fetch/format problems. Documented choice: all map to `invalid_media` (non-retryable) except
 * fetch timeouts (9004 "media could not be fetched", 2207052 "media fetch failed"), which map to
 * `upload_failed` (retryable), because those are usually transient CDN/fetch issues.
 */
const INVALID_MEDIA_SUBCODES = new Set([
  2207004, // image too large
  2207005, // unsupported image format
  2207009, // aspect ratio not supported
  2207026, // unsupported video format
  2207023, // unknown media type
  2207028, // carousel validation failed
  2207035, // product tags on video not supported
  2207053, // unknown upload error / video format
  36000, // image size
  36001, // image aspect ratio
  36003, // aspect ratio
  36004, // caption too long
])
const FETCH_FAILED_CODES = new Set([9004, 2207052])
const PUBLISH_LIMIT_SUBCODE = 2207042

/**
 * Maps a Meta Graph API error response to a PublishingErrorCode.
 * @param httpStatus - HTTP status of the response
 * @param body - Parsed JSON body (unknown shape)
 */
export function classifyMetaError(httpStatus: number, body: unknown): InstagramApiError {
  const meta = parseMetaError(body)
  const code = meta?.code ?? null
  const subcode = meta?.subcode ?? null
  const providerCode = code === null ? undefined : subcode === null ? String(code) : `${code}/${subcode}`
  const detail = meta?.userMessage ?? meta?.message ?? `Instagram API responded with HTTP ${httpStatus}.`
  const make = (errorCode: PublishingErrorCode, retryable?: boolean) =>
    new InstagramApiError({code: errorCode, message: detail, providerCode, httpStatus, retryable})

  if (code === 190) {
    // 458 = app removed by the user. 463 expired, 460 password changed, 467 invalid → reconnect.
    return subcode === 458 ? make('permission_revoked') : make('token_expired')
  }
  if (code === 10 || (code !== null && code >= 200 && code <= 299)) return make('permission_revoked')
  if ((code !== null && RATE_LIMIT_CODES.has(code)) || subcode === PUBLISH_LIMIT_SUBCODE) return make('rate_limited')
  if ((code !== null && FETCH_FAILED_CODES.has(code)) || (subcode !== null && FETCH_FAILED_CODES.has(subcode))) {
    return make('upload_failed')
  }
  if ((code !== null && INVALID_MEDIA_SUBCODES.has(code)) || (subcode !== null && INVALID_MEDIA_SUBCODES.has(subcode))) {
    return make('invalid_media')
  }
  if (code === 1 || code === 2 || httpStatus >= 500 || meta?.isTransient) return make('meta_api_error', true)
  if (httpStatus === 401) return make('token_expired')
  if (httpStatus === 403) return make('permission_revoked')
  if (httpStatus === 429) return make('rate_limited')
  return make('unknown')
}

/** Normalises anything thrown during a request (fetch rejections, aborts) into an InstagramApiError. */
export function toInstagramApiError(error: unknown): InstagramApiError {
  if (error instanceof InstagramApiError) return error
  const name = error instanceof Error ? error.name : ''
  if (name === 'AbortError' || name === 'TimeoutError') {
    return new InstagramApiError({code: 'timeout', message: 'The request to Instagram timed out.', cause: error})
  }
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError on network failures.
    return new InstagramApiError({
      code: 'meta_api_error',
      message: 'Could not reach the Instagram API (network error).',
      retryable: true,
      cause: error,
    })
  }
  return new InstagramApiError({
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Unexpected Instagram API failure.',
    cause: error,
  })
}
