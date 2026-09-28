import {describe, expect, test} from 'vitest'

import {parseIntegrationStatus} from './api'

describe('parseIntegrationStatus (app side of GET /api/health)', () => {
  test('reads the canonical response', () => {
    expect(
      parseIntegrationStatus({ok: true, sanity: true, supabase: true, meta: true, encryption: true, contentAgent: true, instagramMode: 'live'}),
    ).toEqual({ok: true, sanity: true, supabase: true, meta: true, encryption: true, contentAgent: true, instagramMode: 'live'})
  })

  test('a response without `ok` (older backend) is still reachable', () => {
    const parsed = parseIntegrationStatus({sanity: true, supabase: true, meta: true, encryption: true, contentAgent: true, instagramMode: 'live'})
    expect(parsed?.ok).toBe(true)
    expect(parsed?.meta).toBe(true)
  })

  test('misconfigured integrations do not make the backend unreachable', () => {
    const parsed = parseIntegrationStatus({ok: true, sanity: false, supabase: false, meta: false, encryption: false, contentAgent: false, instagramMode: 'unconfigured'})
    expect(parsed).toMatchObject({ok: true, meta: false, instagramMode: 'unconfigured'})
  })

  test('missing or malformed flags read as not configured', () => {
    expect(parseIntegrationStatus({sanity: 'yes', instagramMode: 'weird'})).toEqual({
      ok: true,
      sanity: false,
      supabase: false,
      meta: false,
      encryption: false,
      contentAgent: false,
      instagramMode: 'unconfigured',
    })
  })

  test('a non-object body (proxy error page, array, null) is not a health response', () => {
    expect(parseIntegrationStatus('<html>')).toBeNull()
    expect(parseIntegrationStatus(null)).toBeNull()
    expect(parseIntegrationStatus([])).toBeNull()
  })
})
