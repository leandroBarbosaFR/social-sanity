import 'server-only'
import {getAppBaseUrl} from './env'
import type {ConnectResultReason} from './oauth'

function baseUrlFor(request: Request): string {
  try {
    return getAppBaseUrl()
  } catch {
    return new URL(request.url).origin
  }
}

/** 302 to the result page. Only a fixed reason code or a validated username is put in the URL. */
export function resultRedirect(
  request: Request,
  result: {status: 'connected'; username: string} | {status: 'error'; reason: ConnectResultReason},
  headers: HeadersInit = {},
): Response {
  const url = new URL('/connect/instagram/result', baseUrlFor(request))
  url.searchParams.set('status', result.status)
  if (result.status === 'connected') url.searchParams.set('username', result.username)
  else url.searchParams.set('reason', result.reason)
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Location', url.toString())
  responseHeaders.set('Cache-Control', 'no-store')
  return new Response(null, {status: 302, headers: responseHeaders})
}
