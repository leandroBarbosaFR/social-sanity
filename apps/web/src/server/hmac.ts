import 'server-only'
import {createHmac, timingSafeEqual} from 'node:crypto'
import {getInternalApiSecret} from './env'
import {ApiError} from './errors'

export const TIMESTAMP_HEADER = 'x-social-studio-timestamp'
export const SIGNATURE_HEADER = 'x-social-studio-signature'
const MAX_SKEW_SECONDS = 5 * 60

/** hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)); timestamp is Unix seconds. */
export function signInternalRequest(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
}

/**
 * Verifies a request from Sanity Functions. Returns the raw body (already consumed from the request).
 */
export async function verifyInternalRequest(request: Request): Promise<string> {
  const secret = getInternalApiSecret()
  const timestamp = request.headers.get(TIMESTAMP_HEADER) ?? ''
  const signature = (request.headers.get(SIGNATURE_HEADER) ?? '').toLowerCase()
  if (!/^\d{9,11}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) {
    throw new ApiError(401, 'unauthorized', 'Missing or malformed request signature.')
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > MAX_SKEW_SECONDS) {
    throw new ApiError(401, 'unauthorized', 'Request timestamp is outside the allowed window.')
  }
  const rawBody = await request.text()
  const expected = Buffer.from(signInternalRequest(secret, timestamp, rawBody), 'hex')
  const provided = Buffer.from(signature, 'hex')
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new ApiError(401, 'unauthorized', 'Invalid request signature.')
  }
  return rawBody
}
