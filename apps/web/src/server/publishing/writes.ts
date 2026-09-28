import 'server-only'
import {createHash, randomUUID} from 'node:crypto'
import type {Patch} from '@sanity/client'
import type {PublishingError, PublishingErrorCode, PublishingHistoryEntry} from '@social-studio/shared'
import {logger} from '../log'
import {draftId, getSanityClient, isRevisionConflict} from '../sanity'

export class LockLostError extends Error {
  constructor(postId: string) {
    super(`Publishing lock for ${postId} is no longer held.`)
    this.name = 'LockLostError'
  }
}

export function historyKey(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

/**
 * Applies a patch to the published post (and its draft, if one exists) only while `publishing.lockId`
 * still equals `lockId`. The lock is checked with a GROQ filter and enforced with ifRevisionId;
 * on a revision conflict it re-checks once. Returns false if the lock is no longer held.
 */
export async function writeWithLock(postId: string, lockId: string, apply: (patch: Patch) => Patch): Promise<boolean> {
  const client = getSanityClient()
  for (let attempt = 1; attempt <= 2; attempt++) {
    const state = (await client.fetch(
      `{
        "post": *[_type == "socialPost" && _id == $id && publishing.lockId == $lockId][0]{_id, _rev},
        "draft": *[_id == $draftId][0]{_id}
      }`,
      {id: postId, lockId, draftId: draftId(postId)},
    )) as {post: {_id: string; _rev: string} | null; draft: {_id: string} | null} | null
    if (!state?.post) return false

    const tx = client.transaction()
    tx.patch(apply(client.patch(postId)).ifRevisionId(state.post._rev))
    // Mirror system fields to the draft so publishing the draft later does not revert them.
    if (state.draft) tx.patch(apply(client.patch(state.draft._id)))
    try {
      await tx.commit({visibility: 'sync'})
      return true
    } catch (error) {
      if (isRevisionConflict(error) && attempt < 2) {
        logger.warn('publish_write_conflict_retry', {postId})
        continue
      }
      throw error
    }
  }
  return false
}

/**
 * Deterministic run lock derived from the scheduler's claim lock. The publish-instagram function
 * computes the same value, so it can still mark the post failed after the hand-off.
 */
export function deriveRunLockId(lockId: string): string {
  const h = createHash('sha256').update(`run:${lockId}`).digest('hex')
  const variant = ((parseInt(h.charAt(16), 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/**
 * Atomically swaps the scheduler's claim lock for the run lock. Pubsub delivery is at-least-once;
 * only the first delivery wins the swap, so duplicates can never publish concurrently.
 */
export async function takeOverScheduledLock(postId: string, lockId: string): Promise<string | null> {
  const runLockId = deriveRunLockId(lockId)
  const ok = await writeWithLock(postId, lockId, (patch) => patch.set({'publishing.lockId': runLockId}))
  return ok ? runLockId : null
}

export async function saveContainerId(postId: string, lockId: string, containerId: string): Promise<void> {
  const ok = await writeWithLock(postId, lockId, (patch) => patch.set({'publishing.containerId': containerId}))
  // Abort before media_publish: without the lock we must not publish.
  if (!ok) throw new LockLostError(postId)
}

export async function saveMode(postId: string, lockId: string, mode: 'live' | 'mock'): Promise<void> {
  const ok = await writeWithLock(postId, lockId, (patch) => patch.set({'publishing.mode': mode}))
  if (!ok) throw new LockLostError(postId)
}

interface RunInfo {
  attempt: number
  startedAt: string
  mode: 'live' | 'mock'
  trigger: 'schedule' | 'manual'
}

export async function markPublished(
  postId: string,
  lockId: string,
  run: RunInfo,
  result: {mediaId: string | null; permalink: string | null; message?: string},
): Promise<boolean> {
  const now = new Date().toISOString()
  const entry: PublishingHistoryEntry = {
    _key: historyKey(),
    attempt: run.attempt,
    trigger: run.trigger,
    startedAt: run.startedAt,
    finishedAt: now,
    outcome: 'published',
    mode: run.mode,
    ...(result.message ? {message: result.message} : {}),
  }
  return writeWithLock(postId, lockId, (patch) => {
    let next = patch
      .set({workflowStatus: 'published', publishedAt: now})
      .unset(['publishingError'])
      .setIfMissing({publishingHistory: []})
      .append('publishingHistory', [{_type: 'publishingHistoryEntry', ...entry}])
    next = result.mediaId ? next.set({instagramMediaId: result.mediaId}) : next.unset(['instagramMediaId'])
    next = result.permalink ? next.set({instagramPermalink: result.permalink}) : next.unset(['instagramPermalink'])
    return next
  })
}

export async function markFailed(
  postId: string,
  lockId: string,
  run: RunInfo,
  failure: {code: PublishingErrorCode; message: string; retryable: boolean; providerCode?: string},
): Promise<boolean> {
  const now = new Date().toISOString()
  const publishingError: PublishingError = {
    code: failure.code,
    message: failure.message,
    retryable: failure.retryable,
    occurredAt: now,
    ...(failure.providerCode ? {providerCode: failure.providerCode} : {}),
  }
  const entry: PublishingHistoryEntry = {
    _key: historyKey(),
    attempt: run.attempt,
    trigger: run.trigger,
    startedAt: run.startedAt,
    finishedAt: now,
    outcome: 'failed',
    errorCode: failure.code,
    message: failure.message,
    mode: run.mode,
  }
  return writeWithLock(postId, lockId, (patch) =>
    patch
      .set({workflowStatus: 'failed', publishingError: {_type: 'publishingError', ...publishingError}})
      .setIfMissing({publishingHistory: []})
      .append('publishingHistory', [{_type: 'publishingHistoryEntry', ...entry}]),
  )
}
