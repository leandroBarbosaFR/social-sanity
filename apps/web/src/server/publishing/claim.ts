import 'server-only'
import {randomUUID} from 'node:crypto'
import type {PublishingState, WorkflowStatus} from '@social-studio/shared'
import {logger} from '../log'
import {draftId, getSanityClient, isRevisionConflict} from '../sanity'
import {resumableContainerId, type PostDoc} from './post'

export type ClaimResult =
  | {claimed: true; lockId: string; attempt: number; startedAt: string}
  | {claimed: false; reason: 'conflict' | 'status' | 'not_found'; workflowStatus: string | null}

/**
 * Takes the publishing lock on the published post: sets workflowStatus=publishing and a fresh
 * `publishing` object, guarded by ifRevisionId. A concurrent claim fails with a revision conflict,
 * so exactly one run wins. The previous container is kept only when the last failure was retryable,
 * so a retry resumes the same upload instead of publishing twice.
 */
export async function claimPost(
  post: Pick<PostDoc, '_id' | '_rev' | 'workflowStatus' | 'publishingAttempts' | 'publishing' | 'publishingError'>,
  options: {allowedStatuses: readonly WorkflowStatus[]; mode: 'live' | 'mock'},
): Promise<ClaimResult> {
  const status = post.workflowStatus ?? null
  if (!status || !(options.allowedStatuses as readonly string[]).includes(status)) {
    return {claimed: false, reason: 'status', workflowStatus: status}
  }
  const client = getSanityClient()
  const lockId = randomUUID()
  const startedAt = new Date().toISOString()
  const attempt = (post.publishingAttempts ?? 0) + 1
  const containerId = resumableContainerId(post)
  const publishing: PublishingState = {
    lockId,
    startedAt,
    attempt,
    mode: options.mode,
    ...(containerId ? {containerId} : {}),
  }
  const fields = {
    workflowStatus: 'publishing',
    publishing: {_type: 'publishingState', ...publishing},
    publishingAttempts: attempt,
  }

  const draft = (await client.fetch(`*[_id == $draftId][0]{_id}`, {draftId: draftId(post._id)})) as {
    _id: string
  } | null
  const tx = client.transaction()
  tx.patch(client.patch(post._id).ifRevisionId(post._rev).set(fields).unset(['publishingError']))
  if (draft) tx.patch(client.patch(draft._id).set(fields).unset(['publishingError']))
  try {
    await tx.commit({visibility: 'sync'})
  } catch (error) {
    if (isRevisionConflict(error)) {
      logger.info('publish_claim_conflict', {postId: post._id})
      return {claimed: false, reason: 'conflict', workflowStatus: status}
    }
    throw error
  }
  logger.info('publish_claimed', {postId: post._id, lockId, attempt, resumeContainer: Boolean(containerId)})
  return {claimed: true, lockId, attempt, startedAt}
}
