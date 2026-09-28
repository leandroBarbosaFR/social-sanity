import 'server-only'
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto'

export const STATE_TTL_SECONDS = 600
const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** 32 random bytes, base64url (43 chars). */
export function randomToken(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function isValidStateFormat(value: unknown): value is string {
  return typeof value === 'string' && STATE_PATTERN.test(value)
}

/** Constant-time comparison of two sha256 hex digests. */
export function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === 32 && right.length === 32 && timingSafeEqual(left, right)
}

export interface BindingCookie {
  name: string
  secure: boolean
}

/**
 * `__Host-ig_oauth` (Secure, Path=/, no Domain). Over plain http://localhost the __Host- prefix is
 * impossible (it requires Secure), so development uses `ig_oauth` without Secure.
 */
export function bindingCookie(appBaseUrl: string): BindingCookie {
  const url = new URL(appBaseUrl)
  const insecureLocal = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  return insecureLocal ? {name: 'ig_oauth', secure: false} : {name: '__Host-ig_oauth', secure: true}
}

export function serializeBindingCookie(cookie: BindingCookie, value: string, maxAgeSeconds: number): string {
  const parts = [`${cookie.name}=${value}`, 'Path=/', `Max-Age=${maxAgeSeconds}`, 'HttpOnly', 'SameSite=Lax']
  if (cookie.secure) parts.push('Secure')
  return parts.join('; ')
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim()
  }
  return null
}

export type ConnectResultReason =
  | 'cancelled'
  | 'invalid_state'
  | 'csrf'
  | 'not_professional'
  | 'not_configured'
  | 'meta_error'
  | 'client_missing'
  | 'server_error'

/** Fixed messages: the result page never renders free text from the URL. */
export const CONNECT_RESULT_MESSAGES: Record<ConnectResultReason, string> = {
  cancelled: 'Instagram authorization was cancelled.',
  invalid_state: 'This connection link has expired or was already used. Start again from the app.',
  csrf: 'This connection could not be verified in this browser. Start again from the app in the same browser.',
  not_professional:
    'This Instagram account is not a professional (Business or Creator) account. Switch it to a professional account in Instagram settings and try again.',
  not_configured: 'Instagram connection is not configured on the server.',
  meta_error: 'Instagram returned an error while connecting. Please try again.',
  client_missing: 'The client no longer exists.',
  server_error: 'Something went wrong while saving the connection. Please try again.',
}

export function isConnectResultReason(value: unknown): value is ConnectResultReason {
  return typeof value === 'string' && value in CONNECT_RESULT_MESSAGES
}
