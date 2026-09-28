import {classifyMetaError, InstagramApiError, toInstagramApiError} from './errors'
import {GRAPH_API_VERSION, GRAPH_BASE_URL} from './types'

export const DEFAULT_TIMEOUT_MS = 20_000

export interface RequestOptions {
  method: 'GET' | 'POST'
  /** Absolute URL, or a Graph path such as `/me` (prefixed with graph.instagram.com/v25.0). */
  url: string
  /** Sent as `Authorization: Bearer …` so it never appears in URLs or logs. */
  accessToken?: string
  query?: Record<string, string | undefined>
  /** Sent as application/x-www-form-urlencoded. */
  form?: Record<string, string | undefined>
  timeoutMs?: number
  signal?: AbortSignal
}

export function graphUrl(path: string): string {
  return `${GRAPH_BASE_URL}/${GRAPH_API_VERSION}${path.startsWith('/') ? path : `/${path}`}`
}

function toSearchParams(values: Record<string, string | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) params.set(key, value)
  }
  return params
}

/**
 * Minimal fetch wrapper for Meta APIs. Returns the parsed JSON body (unknown; callers narrow it) and
 * throws InstagramApiError for HTTP errors, timeouts and network failures.
 * It never logs, and never puts the bearer token in the URL.
 */
export async function requestJson(options: RequestOptions): Promise<unknown> {
  const url = new URL(/^https?:\/\//.test(options.url) ? options.url : graphUrl(options.url))
  if (options.query) {
    for (const [key, value] of toSearchParams(options.query)) url.searchParams.set(key, value)
  }
  const headers: Record<string, string> = {Accept: 'application/json'}
  if (options.accessToken) headers['Authorization'] = `Bearer ${options.accessToken}`
  let body: URLSearchParams | undefined
  if (options.form) {
    body = toSearchParams(options.form)
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout

  let response: Response
  let text: string
  try {
    response = await fetch(url, {method: options.method, headers, body, signal, cache: 'no-store'})
    text = await response.text()
  } catch (error) {
    throw toInstagramApiError(error)
  }

  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }
  if (!response.ok) throw classifyMetaError(response.status, parsed)
  if (parsed === null) {
    throw new InstagramApiError({
      code: 'meta_api_error',
      message: 'Instagram API returned a response that is not JSON.',
      httpStatus: response.status,
      retryable: true,
    })
  }
  // Some Graph endpoints return 200 with an error object.
  if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
    throw classifyMetaError(response.status, parsed)
  }
  return parsed
}

export function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>
  throw unexpected('an object')
}

export function readString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key]
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  throw unexpected(`"${key}"`)
}

export function readOptionalString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function readNumber(obj: Record<string, unknown>, key: string): number {
  const value = obj[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  throw unexpected(`"${key}"`)
}

function unexpected(what: string): InstagramApiError {
  return new InstagramApiError({
    code: 'meta_api_error',
    message: `Instagram API response is missing ${what}.`,
    retryable: false,
  })
}
