import 'server-only'
import {DatabaseConfigError} from '@social-studio/database'
import type {ApiErrorBody, ApiErrorCode} from '@social-studio/shared'
import {ApiError} from './errors'
import {corsHeaders} from './cors'
import {logger} from './log'

export {ApiError}

export function json(body: unknown, init: {status?: number; headers?: HeadersInit} = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(body), {status: init.status ?? 200, headers})
}

export function errorBody(code: ApiErrorCode, message: string, extra?: Record<string, unknown>): ApiErrorBody {
  return {...extra, error: {code, message}}
}

/** Converts anything thrown in a handler into an ApiError. Unknown errors become a generic 500. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof DatabaseConfigError) return new ApiError(503, error.code, error.message)
  logger.error('unhandled_error', {error})
  return new ApiError(500, 'internal_error', 'Something went wrong on the server.')
}

/**
 * Runs an API handler: adds CORS headers when requested, converts errors to ApiErrorBody,
 * and never leaks stack traces or secrets.
 */
export async function handleApi(
  request: Request,
  options: {cors: boolean},
  handler: () => Promise<Response>,
): Promise<Response> {
  let response: Response
  try {
    response = await handler()
  } catch (error) {
    const apiError = toApiError(error)
    response = json(errorBody(apiError.code, apiError.message, apiError.extra), {status: apiError.status})
  }
  if (options.cors) {
    for (const [key, value] of corsHeaders(request)) response.headers.set(key, value)
  }
  return response
}

/** Reads and JSON-parses a request body; invalid JSON is a 400. */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError(400, 'bad_request', 'Request body must be valid JSON.')
  }
}

const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/** Validates a Sanity document ID from a URL/body. Accepts `drafts.<id>` and returns the published ID. */
export function toPublishedId(raw: unknown, label: string): string {
  if (typeof raw !== 'string') throw new ApiError(400, 'bad_request', `${label} is required.`)
  const id = raw.startsWith('drafts.') ? raw.slice('drafts.'.length) : raw
  if (!DOCUMENT_ID.test(id) || id.startsWith('versions.')) {
    throw new ApiError(400, 'bad_request', `${label} is not a valid document ID.`)
  }
  return id
}
