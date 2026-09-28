import {createHmac, randomUUID} from 'node:crypto'
import {createClient, type SanityClient} from '@sanity/client'
import {invoke, scheduledEventHandler} from '@sanity/functions'

/**
 * Runs every 5 minutes (org-scoped scheduled function):
 * 1. Claims due scheduled posts (workflowStatus=scheduled, scheduledAt <= now) with an ifRevisionId
 *    guard and hands each claim to the `publish-instagram` pubsub function.
 * 2. Recovers stale locks: posts stuck in `publishing` for more than 20 minutes become `failed`
 *    with a retryable `timeout`.
 * 3. Once a day (03:00–03:04 UTC) asks the backend to refresh expiring Instagram tokens.
 * With `context.local` (sanity functions test) it only logs what it would do.
 */

const API_VERSION = '2026-09-01'
const BATCH_SIZE = 25
const STALE_LOCK_MINUTES = 20

interface DuePost {
  _id: string
  _rev: string
  publishingAttempts?: number | null
  publishing?: {containerId?: string | null} | null
  publishingError?: {code?: string | null; retryable?: boolean | null} | null
}

interface StalePost {
  _id: string
  _rev: string
  publishing?: {lockId?: string | null; startedAt?: string | null; attempt?: number | null; mode?: string | null} | null
}

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({fn: 'schedule-posts', event, ...fields}))
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

function key(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12)
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

/** Marks the post failed only while `publishing.lockId` still equals `lockId` (GROQ check + ifRevisionId). */
async function failWithLock(
  client: SanityClient,
  postId: string,
  lockId: string,
  failure: {code: string; message: string; retryable: boolean},
): Promise<boolean> {
  const post = await client.fetch<StalePost | null>(
    `*[_id == $id && publishing.lockId == $lockId && workflowStatus == "publishing"][0]{_id, _rev, publishing}`,
    {id: postId, lockId},
  )
  if (!post) return false
  const now = new Date().toISOString()
  const apply = (patch: ReturnType<SanityClient['patch']>) =>
    patch
      .set({workflowStatus: 'failed', publishingError: {_type: 'publishingError', ...failure, occurredAt: now}})
      .setIfMissing({publishingHistory: []})
      .append('publishingHistory', [
        {
          _type: 'publishingHistoryEntry',
          _key: key(),
          attempt: post.publishing?.attempt ?? 1,
          trigger: 'schedule',
          startedAt: post.publishing?.startedAt ?? now,
          finishedAt: now,
          outcome: 'failed',
          errorCode: failure.code,
          message: failure.message,
          ...(post.publishing?.mode === 'live' || post.publishing?.mode === 'mock' ? {mode: post.publishing.mode} : {}),
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

async function claim(client: SanityClient, post: DuePost): Promise<string | null> {
  const lockId = randomUUID()
  const attempt = (post.publishingAttempts ?? 0) + 1
  const keepContainer = post.publishingError?.retryable === true && post.publishing?.containerId
  const fields = {
    workflowStatus: 'publishing',
    publishing: {
      _type: 'publishingState',
      lockId,
      startedAt: new Date().toISOString(),
      attempt,
      ...(keepContainer ? {containerId: post.publishing?.containerId} : {}),
    },
    publishingAttempts: attempt,
  }
  const draft = await client.fetch<{_id: string} | null>(`*[_id == $id][0]{_id}`, {id: `drafts.${post._id}`})
  const tx = client.transaction()
  tx.patch(client.patch(post._id).ifRevisionId(post._rev).set(fields).unset(['publishingError']))
  if (draft) tx.patch(client.patch(draft._id).set(fields).unset(['publishingError']))
  try {
    await tx.commit({visibility: 'sync'})
    return lockId
  } catch (error) {
    if (statusCodeOf(error) === 409) {
      log('claim_conflict', {postId: post._id})
      return null
    }
    throw error
  }
}

async function recoverStaleLocks(client: SanityClient, dryRun: boolean): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000).toISOString()
  const stale = await client.fetch<StalePost[]>(
    `*[_type == "socialPost" && workflowStatus == "publishing" && publishing.startedAt < $cutoff
       && !(_id in path("drafts.**")) && !(_id in path("versions.**"))][0...${BATCH_SIZE}]{_id, _rev, publishing}`,
    {cutoff},
  )
  for (const post of stale) {
    if (dryRun) {
      log('stale_lock_dry_run', {postId: post._id, startedAt: post.publishing?.startedAt})
      continue
    }
    const lockId = post.publishing?.lockId
    if (!lockId) {
      log('stale_lock_without_lock_id', {postId: post._id})
      continue
    }
    const message = `Publishing did not finish within ${STALE_LOCK_MINUTES} minutes. Retrying resumes the same upload.`
    try {
      const released = await failWithLock(client, post._id, lockId, {code: 'timeout', message, retryable: true})
      log(released ? 'stale_lock_recovered' : 'stale_lock_changed', {postId: post._id, lockId})
    } catch (error) {
      log('stale_lock_recovery_failed', {postId: post._id, message: errorMessage(error)})
    }
  }
}

async function refreshTokensDaily(dryRun: boolean): Promise<void> {
  const now = new Date()
  if (now.getUTCHours() !== 3 || now.getUTCMinutes() >= 5) return
  if (dryRun) {
    log('refresh_tokens_dry_run')
    return
  }
  const baseUrl = requireEnv('WEB_BASE_URL').replace(/\/+$/, '')
  const secret = requireEnv('INTERNAL_API_SECRET')
  const body = '{}'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  try {
    const response = await fetch(`${baseUrl}/api/internal/refresh-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-social-studio-timestamp': timestamp,
        'x-social-studio-signature': signature,
      },
      body,
      signal: AbortSignal.timeout(45_000),
    })
    log('refresh_tokens_called', {status: response.status, body: await response.text().catch(() => '')})
  } catch (error) {
    log('refresh_tokens_failed', {message: errorMessage(error)})
  }
}

export const handler = scheduledEventHandler(async ({context}) => {
  // Org-scoped scheduled functions get no project/dataset in context: read them from env.
  const projectId = requireEnv('SANITY_PROJECT_ID')
  const dataset = requireEnv('SANITY_DATASET')
  const token = context.clientOptions?.token
  if (!token) throw new Error('No robot token in context.clientOptions.token (check robotToken in the blueprint).')
  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'raw',
    ...(context.clientOptions?.apiHost ? {apiHost: context.clientOptions.apiHost} : {}),
  })
  const dryRun = context.local === true

  await recoverStaleLocks(client, dryRun)

  const due = await client.fetch<DuePost[]>(
    `*[_type == "socialPost" && workflowStatus == "scheduled" && dateTime(scheduledAt) <= dateTime(now())
       && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]
      | order(scheduledAt asc)[0...${BATCH_SIZE}]{_id, _rev, publishingAttempts, publishing, publishingError}`,
  )
  log('due_posts', {count: due.length, dryRun})

  for (const post of due) {
    if (dryRun) {
      log('claim_dry_run', {postId: post._id})
      continue
    }
    const lockId = await claim(client, post)
    if (!lockId) continue
    try {
      await invoke('publish-instagram', {context, event: {data: {postId: post._id, lockId}}})
      log('publish_invoked', {postId: post._id, lockId})
    } catch (error) {
      const message = `Could not start the publishing run: ${errorMessage(error)}`
      log('invoke_failed', {postId: post._id, lockId, message})
      // Release the claim as a retryable failure so nothing hangs in `publishing`.
      await failWithLock(client, post._id, lockId, {code: 'unknown', message, retryable: true}).catch((patchError: unknown) =>
        log('invoke_failure_mark_failed', {postId: post._id, message: errorMessage(patchError)}),
      )
    }
  }

  await refreshTokensDaily(dryRun)
})
