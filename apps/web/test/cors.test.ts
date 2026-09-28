import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {GET, OPTIONS} from '@/app/api/health/route'
import {corsHeadersFor, parseAllowedOrigins} from '@/server/corsPolicy'

// A deployed App SDK app runs on its own origin inside the Dashboard iframe, not on www.sanity.io.
const APP_ORIGIN = 'https://hmaphqr3mn98.sanity.studio'
const LOCAL_APP = 'http://localhost:3333'
const HEALTH = 'https://backend.example/api/health'

describe('parseAllowedOrigins', () => {
  test('splits, trims and normalises a comma-separated list', () => {
    expect([...parseAllowedOrigins(` ${APP_ORIGIN}/ ,  ${LOCAL_APP} ,https://www.sanity.io`)]).toEqual([
      APP_ORIGIN,
      LOCAL_APP,
      'https://www.sanity.io',
    ])
  })

  test('drops paths so only the origin is compared', () => {
    expect([...parseAllowedOrigins('https://example.com/some/path')]).toEqual(['https://example.com'])
  })

  test('never trusts wildcards, malformed or non-http entries', () => {
    expect([...parseAllowedOrigins('*, https://*.sanity.studio, not a url, ftp://x.example, ,')]).toEqual([])
  })

  test('missing configuration allows nothing', () => {
    expect(parseAllowedOrigins(undefined).size).toBe(0)
  })
})

describe('corsHeadersFor', () => {
  const allowed = parseAllowedOrigins(`${APP_ORIGIN},${LOCAL_APP}`)

  test('reflects an allowed origin exactly, never a wildcard, never credentials', () => {
    const headers = corsHeadersFor(APP_ORIGIN, allowed)
    expect(headers.get('Access-Control-Allow-Origin')).toBe(APP_ORIGIN)
    expect(headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(headers.get('Access-Control-Allow-Credentials')).toBeNull()
    expect(headers.get('Vary')).toBe('Origin')
  })

  test('each of several configured origins is allowed', () => {
    expect(corsHeadersFor(LOCAL_APP, allowed).get('Access-Control-Allow-Origin')).toBe(LOCAL_APP)
  })

  test('rejects an origin that is not configured (the production bug: app origin missing)', () => {
    const headers = corsHeadersFor(APP_ORIGIN, parseAllowedOrigins('https://www.sanity.io'))
    expect(headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(headers.get('Vary')).toBe('Origin')
  })

  test('rejects look-alike origins', () => {
    expect(corsHeadersFor(`${APP_ORIGIN}.evil.example`, allowed).get('Access-Control-Allow-Origin')).toBeNull()
    expect(corsHeadersFor('http://hmaphqr3mn98.sanity.studio', allowed).get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('requests without an Origin get no CORS grant', () => {
    expect(corsHeadersFor(null, allowed).get('Access-Control-Allow-Origin')).toBeNull()
  })
})

describe('/api/health route', () => {
  beforeEach(() => vi.stubEnv('ALLOWED_APP_ORIGINS', `${LOCAL_APP}, ${APP_ORIGIN}`))
  afterEach(() => vi.unstubAllEnvs())

  test('OPTIONS preflight from the app origin is allowed', () => {
    const response = OPTIONS(
      new Request(HEALTH, {
        method: 'OPTIONS',
        headers: {Origin: APP_ORIGIN, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization'},
      }),
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(APP_ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })

  test('OPTIONS preflight from an unknown origin gets no grant', () => {
    const response = OPTIONS(new Request(HEALTH, {method: 'OPTIONS', headers: {Origin: 'https://evil.example'}}))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('GET answers ok with integration flags, even when integrations are not configured', async () => {
    const response = await GET(new Request(HEALTH, {headers: {Origin: APP_ORIGIN}}))
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(APP_ORIGIN)
    const body = (await response.json()) as Record<string, unknown>
    expect(body.ok).toBe(true)
    for (const key of ['sanity', 'supabase', 'meta', 'encryption', 'contentAgent']) expect(typeof body[key]).toBe('boolean')
    expect(['live', 'mock', 'unconfigured']).toContain(body.instagramMode)
    expect(JSON.stringify(body)).not.toMatch(/token|secret|key/i)
  })
})
