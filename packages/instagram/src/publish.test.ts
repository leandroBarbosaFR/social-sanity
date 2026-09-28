import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {classifyMetaError, InstagramApiError, toInstagramApiError} from './errors'
import {publishCarousel, publishMedia, publishReel} from './publish'

const meta = (code: number, subcode?: number, message = 'Meta says no') => ({
  error: {message, type: 'OAuthException', code, ...(subcode === undefined ? {} : {error_subcode: subcode}), fbtrace_id: 'x'},
})

describe('classifyMetaError', () => {
  test.each([
    [400, meta(190, 463), 'token_expired', false],
    [400, meta(190, 458), 'permission_revoked', false],
    [403, meta(10), 'permission_revoked', false],
    [400, meta(200), 'permission_revoked', false],
    [400, meta(4), 'rate_limited', true],
    [400, meta(9, 2207042), 'rate_limited', true],
    [400, meta(36003, 2207009), 'invalid_media', false],
    [400, meta(9004, 2207052), 'upload_failed', true],
    [500, meta(2), 'meta_api_error', true],
    [503, {}, 'meta_api_error', true],
    [401, {}, 'token_expired', false],
    // Unknown failures stay retryable by policy (PUBLISHING_ERRORS): container resume makes a manual retry safe.
    [418, {}, 'unknown', true],
  ] as const)('HTTP %s %j → %s', (status, body, code, retryable) => {
    const error = classifyMetaError(status, body)
    expect(error).toBeInstanceOf(InstagramApiError)
    expect(error.code).toBe(code)
    expect(error.retryable).toBe(retryable)
  })

  test('keeps the Meta code/subcode for support, and the user-facing message', () => {
    const error = classifyMetaError(400, {error: {message: 'raw', error_user_msg: 'Pick a smaller image', code: 36001, error_subcode: 2207004}})
    expect(error.providerCode).toBe('36001/2207004')
    expect(error.message).toBe('Pick a smaller image')
  })

  test('handles OAuth token endpoint errors', () => {
    expect(classifyMetaError(400, {error_type: 'OAuthException', code: 400, error_message: 'Invalid code'}).message).toBe('Invalid code')
  })

  test('timeouts and network failures are typed', () => {
    expect(toInstagramApiError(Object.assign(new Error('x'), {name: 'TimeoutError'})).code).toBe('timeout')
    const network = toInstagramApiError(new TypeError('fetch failed'))
    expect(network.code).toBe('meta_api_error')
    expect(network.retryable).toBe(true)
  })
})

/**
 * A scripted Graph API: each route answers from a queue, and every call is recorded so tests can
 * assert what was (and was not) sent to Instagram.
 */
function graph(routes: Record<string, Array<{status?: number; body: unknown}>>) {
  const calls: string[] = []
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/v[\d.]+/, '')}`
    calls.push(key)
    const next = routes[key]?.shift()
    if (!next) throw new Error(`Unexpected Graph call: ${key}`)
    return new Response(JSON.stringify(next.body), {status: next.status ?? 200, headers: {'Content-Type': 'application/json'}})
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

const options = (existingContainerId: string | null = null, onContainerCreated = vi.fn()) => ({
  accessToken: 'token',
  igUserId: 'ig1',
  existingContainerId,
  onContainerCreated,
  processingDeadlineMs: 5_000,
})
const image = {kind: 'image' as const, url: 'https://cdn.sanity.io/a.jpg'}

describe('publish flow idempotency', () => {
  beforeEach(() => vi.useFakeTimers({toFake: ['setTimeout']}))
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('happy path: container → persisted before publish → media_publish once', async () => {
    const saved = vi.fn()
    const calls = graph({
      'POST /ig1/media': [{body: {id: 'c1'}}],
      'GET /c1': [{body: {status_code: 'FINISHED'}}],
      'POST /ig1/media_publish': [{body: {id: 'm1'}}],
    })
    const result = await publishMedia({image, caption: 'Hi'}, options(null, saved))
    expect(result).toMatchObject({mediaId: 'm1', containerId: 'c1', alreadyPublished: false})
    expect(saved).toHaveBeenCalledWith('c1')
    expect(calls.filter((call) => call.endsWith('media_publish'))).toHaveLength(1)
  })

  test('a retry whose container was already published never publishes again', async () => {
    const calls = graph({'GET /c1': [{body: {status_code: 'PUBLISHED'}}]})
    const result = await publishMedia({image, caption: 'Hi'}, options('c1'))
    expect(result).toMatchObject({alreadyPublished: true, mediaId: null})
    expect(calls).toEqual(['GET /c1'])
  })

  test('a retry resumes a still-valid container instead of uploading again', async () => {
    const calls = graph({
      'GET /c1': [{body: {status_code: 'FINISHED'}}, {body: {status_code: 'FINISHED'}}],
      'POST /ig1/media_publish': [{body: {id: 'm1'}}],
    })
    await publishMedia({image, caption: 'Hi'}, options('c1'))
    expect(calls).not.toContain('POST /ig1/media')
  })

  test('an expired container is replaced (it was never published)', async () => {
    const calls = graph({
      'GET /c1': [{body: {status_code: 'EXPIRED'}}],
      'POST /ig1/media': [{body: {id: 'c2'}}],
      'GET /c2': [{body: {status_code: 'FINISHED'}}],
      'POST /ig1/media_publish': [{body: {id: 'm2'}}],
    })
    const result = await publishMedia({image, caption: 'Hi'}, options('c1'))
    expect(result.containerId).toBe('c2')
    expect(calls).toContain('POST /ig1/media')
  })

  test('a transient failure while checking the old container aborts instead of risking a duplicate', async () => {
    const calls = graph({'GET /c1': [{status: 503, body: {}}]})
    await expect(publishMedia({image, caption: 'Hi'}, options('c1'))).rejects.toMatchObject({code: 'meta_api_error'})
    expect(calls).not.toContain('POST /ig1/media')
    expect(calls).not.toContain('POST /ig1/media_publish')
  })

  test('a container that fails processing surfaces as a typed error, without publishing', async () => {
    const calls = graph({
      'POST /ig1/media': [{body: {id: 'c1'}}],
      'GET /c1': [{body: {status_code: 'ERROR', status: 'Error: Unsupported format'}}],
    })
    await expect(publishMedia({image, caption: 'Hi'}, options())).rejects.toBeInstanceOf(InstagramApiError)
    expect(calls).not.toContain('POST /ig1/media_publish')
  })

  test('format rules are enforced before any call to Meta', async () => {
    const calls = graph({})
    await expect(publishReel({video: image, caption: 'x'}, options())).rejects.toMatchObject({code: 'invalid_media'})
    await expect(publishCarousel({items: [image], caption: 'x'}, options())).rejects.toMatchObject({code: 'invalid_media'})
    expect(calls).toEqual([])
  })
})
