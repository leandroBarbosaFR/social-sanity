import {createHash, createHmac, randomUUID} from 'node:crypto'
import {createClient, type SanityClient} from '@sanity/client'
import {pubSubEventHandler} from '@sanity/functions'

/**
 * PubSub function invoked by `schedule-posts` with {postId, lockId} for a post it already claimed.
 * Calls the backend's signed /api/internal/publish (which can take up to ~300 s). If the call itself
 * fails, the post is marked failed (guarded by lockId) so nothing silently stays in `publishing`.
 */

const API_VERSION = '2026-09-01'
const REQUEST_TIMEOUT_MS = 290_000

interface PublishEventData {
  postId: string
  lockId: string
}

interface LockedPost {
  _id: string
  _rev: string
  publishing?: {attempt?: number | null; startedAt?: string | null; mode?: string | null} | null
}

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({fn: 'publish-instagram', event, ...fields}))
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function statusCodeOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const value = (error as {statusCode: unknown}).statusCode
    return typeof value === 'number' ? value : undefined
  }
  return undefined
}

function isPublishEventData(value: unknown): value is PublishEventData {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record['postId'] === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(record['postId']) &&
    typeof record['lockId'] === 'string' &&
    /^[0-9a-f-]{36}$/i.test(record['lockId'])
  )
}

/** Same derivation as apps/web deriveRunLockId: the backend swaps the claim lock for this run lock. */
function deriveRunLockId(lockId: string): string {
  const h = createHash('sha256').update(`run:${lockId}`).digest('hex')
  const variant = ((parseInt(h.charAt(16), 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/**
 * Marks the post failed only while `publishing.lockId` is still this run's claim lock or the
 * backend's derived run lock (i.e. nobody else has claimed the post since).
 */
async function failWithLock(
  client: SanityClient,
  postId: string,
  lockId: string,
  failure: {code: string; message: string; retryable: boolean},
): Promise<boolean> {
  const post = await client.fetch<LockedPost | null>(
    `*[_id == $id && publishing.lockId in [$lockId, $runLockId] && workflowStatus == "publishing"][0]{_id, _rev, publishing}`,
    {id: postId, lockId, runLockId: deriveRunLockId(lockId)},
  )
  if (!post) return false
  const now = new Date().toISOString()
  const mode = post.publishing?.mode === 'live' || post.publishing?.mode === 'mock' ? post.publishing.mode : undefined
  const apply = (patch: ReturnType<SanityClient['patch']>) =>
    patch
      .set({workflowStatus: 'failed', publishingError: {_type: 'publishingError', ...failure, occurredAt: now}})
      .setIfMissing({publishingHistory: []})
      .append('publishingHistory', [
        {
          _type: 'publishingHistoryEntry',
          _key: randomUUID().replace(/-/g, '').slice(0, 12),
          attempt: post.publishing?.attempt ?? 1,
          trigger: 'schedule',
          startedAt: post.publishing?.startedAt ?? now,
          finishedAt: now,
          outcome: 'failed',
          errorCode: failure.code,
          message: failure.message,
          ...(mode ? {mode} : {}),
        },
      ])
  const draft = await client.fetch<{_id: string} | null>(`*[_id == $id][0]{_id}`, {id: `drafts.${postId}`})
  const tx = client.transaction()
  tx.patch(apply(client.patch(postId).ifRevisionId(post._rev)))
  if (draft) tx.patch(apply(client.patch(draft._id)))
  try {
    await tx.commit()
    return true
  } catch (error) {
    if (statusCodeOf(error) === 409) return false
    throw error
  }
}

type CallResult =
  | {ok: true; status: number}
  | {ok: false; failure: {code: string; message: string; retryable: boolean}}

async function callBackend(data: PublishEventData): Promise<CallResult> {
  const baseUrl = requireEnv('WEB_BASE_URL').replace(/\/+$/, '')
  const secret = requireEnv('INTERNAL_API_SECRET')
  const body = JSON.stringify({postId: data.postId, lockId: data.lockId})
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/internal/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-social-studio-timestamp': timestamp,
        'x-social-studio-signature': signature,
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      return {ok: false, failure: {code: 'timeout', message: 'The publishing backend did not respond in time.', retryable: true}}
    }
    return {
      ok: false,
      failure: {code: 'meta_api_error', message: `Could not reach the publishing backend: ${errorMessage(error)}`, retryable: true},
    }
  }
  const text = await response.text().catch(() => '')
  // 200: the backend recorded the outcome itself. 409: lock mismatch; the owner of the lock handles it.
  if (response.ok || response.status === 409) {
    log('backend_response', {postId: data.postId, status: response.status, body: text.slice(0, 500)})
    return {ok: true, status: response.status}
  }
  if (response.status === 401 || response.status === 503) {
    return {
      ok: false,
      failure: {
        code: 'not_configured',
        message: `The publishing backend rejected the request (HTTP ${response.status}); check INTERNAL_API_SECRET and server configuration.`,
        retryable: false,
      },
    }
  }
  if (response.status === 504) {
    return {ok: false, failure: {code: 'timeout', message: 'The publishing backend timed out.', retryable: true}}
  }
  return {
    ok: false,
    failure: {code: 'meta_api_error', message: `The publishing backend failed (HTTP ${response.status}).`, retryable: true},
  }
}

export const handler = pubSubEventHandler(async ({context, event}) => {
  const data: unknown = event.data
  if (!isPublishEventData(data)) {
    log('invalid_event', {})
    return
  }
  const projectId = process.env['SANITY_PROJECT_ID']?.trim() || context.clientOptions?.projectId
  const dataset = process.env['SANITY_DATASET']?.trim() || context.clientOptions?.dataset
  const token = context.clientOptions?.token
  if (!projectId || !dataset || !token) {
    // Cannot even record the failure; the scheduler's stale-lock recovery will mark it failed.
    log('missing_configuration', {postId: data.postId, hasProjectId: Boolean(projectId), hasDataset: Boolean(dataset), hasToken: Boolean(token)})
    return
  }
  const client = createClient({projectId, dataset, token, apiVersion: API_VERSION, useCdn: false, perspective: 'raw'})

  if (context.local) {
    log('dry_run', {postId: data.postId, lockId: data.lockId})
    return
  }

  let result: CallResult
  try {
    result = await callBackend(data)
  } catch (error) {
    // e.g. missing WEB_BASE_URL / INTERNAL_API_SECRET
    result = {ok: false, failure: {code: 'not_configured', message: errorMessage(error), retryable: false}}
  }
  if (result.ok) return

  log('backend_call_failed', {postId: data.postId, lockId: data.lockId, code: result.failure.code, message: result.failure.message})
  try {
    const marked = await failWithLock(client, data.postId, data.lockId, result.failure)
    log(marked ? 'marked_failed' : 'lock_changed', {postId: data.postId, lockId: data.lockId})
  } catch (error) {
    log('mark_failed_error', {postId: data.postId, message: errorMessage(error)})
  }
})
