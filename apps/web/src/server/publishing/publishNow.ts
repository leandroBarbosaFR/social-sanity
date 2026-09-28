import 'server-only'
import {
  CONFIRMABLE_PUBLISH_STATUSES,
  DIRECT_PUBLISH_STATUSES,
  validatePostForPublishing,
  type PublishNowResponse,
  type WorkflowStatus,
} from '@social-studio/shared'
import {ApiError} from '../errors'
import {getInstagramService} from '../instagram'
import {logger} from '../log'
import {claimPost} from './claim'
import {compareDraft, fetchPublishedPost, toValidationInput} from './post'
import {runPublish} from './run'

/**
 * "Publish now" / retry from the app. Validates without touching the document, claims the lock,
 * then runs the publish synchronously.
 */
export async function publishNow(postId: string, options: {confirmUnapproved: boolean; userId: string}): Promise<PublishNowResponse> {
  // Fail fast (503) before claiming if Instagram is not configured.
  const service = getInstagramService()

  const post = await fetchPublishedPost(postId)
  const draftState = await compareDraft(postId)
  if (!post) {
    if (draftState === 'draft_only') {
      throw new ApiError(409, 'conflict', 'Save (publish) the post’s latest changes first.')
    }
    throw new ApiError(404, 'not_found', 'Post not found.')
  }
  if (draftState === 'different') {
    throw new ApiError(409, 'conflict', 'Save (publish) the post’s latest changes first.')
  }

  const status = post.workflowStatus
  if (status === 'publishing') return {outcome: 'in_progress'}
  if (status === 'published') return {outcome: 'already_published'}
  const isDirect = (DIRECT_PUBLISH_STATUSES as readonly (string | null | undefined)[]).includes(status)
  const isConfirmable = (CONFIRMABLE_PUBLISH_STATUSES as readonly (string | null | undefined)[]).includes(status)
  if (!isDirect && !isConfirmable) {
    throw new ApiError(409, 'publish_rejected', 'This post cannot be published from its current status.')
  }
  if (isConfirmable && !options.confirmUnapproved) {
    throw new ApiError(
      409,
      'publish_rejected',
      'This post has not been approved. Confirm to publish it anyway.',
      {requiresConfirmation: true},
    )
  }

  const issues = validatePostForPublishing(toValidationInput(post))
  if (issues.length > 0) {
    throw new ApiError(400, 'publish_rejected', issues.map((issue) => issue.message).join(' '), {issues})
  }

  const allowedStatuses: readonly WorkflowStatus[] = options.confirmUnapproved
    ? [...DIRECT_PUBLISH_STATUSES, ...CONFIRMABLE_PUBLISH_STATUSES]
    : DIRECT_PUBLISH_STATUSES
  const claim = await claimPost(post, {allowedStatuses, mode: service.mode})
  if (!claim.claimed) {
    // Someone else changed or claimed the post between our read and our write.
    const latest = await fetchPublishedPost(postId)
    if (latest?.workflowStatus === 'publishing') return {outcome: 'in_progress'}
    if (latest?.workflowStatus === 'published') return {outcome: 'already_published'}
    throw new ApiError(409, 'conflict', 'The post changed while publishing was starting. Try again.')
  }

  logger.info('publish_now_started', {postId, lockId: claim.lockId, userId: options.userId})
  const result = await runPublish(postId, claim.lockId, 'manual')
  switch (result.outcome) {
    case 'published':
      return {
        outcome: 'published',
        instagramMediaId: result.instagramMediaId,
        permalink: result.permalink,
        mode: result.mode,
      }
    case 'failed':
      return {outcome: 'failed', errorCode: result.errorCode, message: result.message}
    case 'lock_lost':
      return {outcome: 'in_progress'}
  }
}
