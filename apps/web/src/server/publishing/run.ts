import 'server-only'
import type {SocialAccountsRepository} from '@social-studio/database'
import {
  isMockId,
  type InstagramService,
  type MediaInput,
  type PublishOptions,
  type PublishResult,
} from '@social-studio/instagram'
import {composeCaption, validatePostForPublishing, type PublishingErrorCode} from '@social-studio/shared'
import {getSocialAccounts} from '../database'
import {getInstagramService} from '../instagram'
import {logger} from '../log'
import {tickPostWorkflows} from '../workflows'
import {PublishFailure, toFailureInfo} from './failure'
import {fetchLockedPost, resolveMedia, toValidationInput, type PostDoc} from './post'
import {isExpired, markAccountUnusable, refreshIfNeeded} from './tokens'
import {LockLostError, markFailed, markPublished, saveContainerId, saveMode} from './writes'

export type Trigger = 'schedule' | 'manual'

export type RunOutcome =
  | {
      outcome: 'published'
      instagramMediaId: string | null
      permalink: string | null
      mode: 'live' | 'mock'
      alreadyPublished: boolean
    }
  | {outcome: 'failed'; errorCode: PublishingErrorCode; message: string; retryable: boolean}
  | {outcome: 'lock_lost'}

/** Keep the whole run inside the 300 s route limit (claim + validation + polling + publish + writes). */
const PROCESSING_DEADLINE_MS = 200_000
const INLINE_REFRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

async function publishByFormat(
  service: InstagramService,
  post: PostDoc,
  options: PublishOptions,
): Promise<PublishResult> {
  const media: MediaInput[] = resolveMedia(post).map((item) => {
    if (!item.url) throw new PublishFailure('validation_failed', 'A media item has no uploaded file.')
    return {kind: item.kind, url: item.url, altText: item.alt}
  })
  const caption = composeCaption(post.caption, post.hashtags)
  const first = media[0]
  switch (post.format) {
    case 'image':
      if (!first) throw new PublishFailure('validation_failed', 'An image post needs exactly one image.')
      return service.publishMedia({image: first, caption}, options)
    case 'carousel':
      return service.publishCarousel({items: media, caption}, options)
    case 'reel':
      if (!first) throw new PublishFailure('validation_failed', 'A Reel needs exactly one video.')
      return service.publishReel({video: first, caption, coverUrl: post.coverUrl ?? null, shareToFeed: true}, options)
    case 'story':
      if (!first) throw new PublishFailure('validation_failed', 'A Story needs exactly one image or video.')
      return service.publishStory({media: first}, options)
    default:
      throw new PublishFailure('validation_failed', 'Unknown post format.')
  }
}

/**
 * Runs a claimed publish to completion. Every path ends with the post `published` or `failed`
 * (unless the lock was taken over, in which case nothing is written). All writes are lock-guarded.
 */
export async function runPublish(postId: string, lockId: string, trigger: Trigger): Promise<RunOutcome> {
  const post = await fetchLockedPost(postId, lockId)
  if (!post || post.workflowStatus !== 'publishing') {
    logger.warn('publish_lock_mismatch', {postId, lockId})
    return {outcome: 'lock_lost'}
  }
  const attempt = post.publishing?.attempt ?? post.publishingAttempts ?? 1
  const startedAt = post.publishing?.startedAt ?? new Date().toISOString()
  let mode: 'live' | 'mock' = post.publishing?.mode ?? 'live'
  let repo: SocialAccountsRepository | null = null

  try {
    let service: InstagramService
    try {
      service = getInstagramService()
    } catch (error) {
      throw new PublishFailure('not_configured', error instanceof Error ? error.message : 'Instagram is not configured.')
    }
    if (service.mode !== mode) {
      mode = service.mode
      await saveMode(postId, lockId, mode)
    }

    const issues = validatePostForPublishing(toValidationInput(post))
    if (issues.length > 0) {
      throw new PublishFailure('validation_failed', issues.map((issue) => issue.message).join(' '))
    }
    const clientId = post.clientId
    if (!clientId) throw new PublishFailure('validation_failed', 'Select a client.')

    repo = getSocialAccounts()
    const connection = await repo.getDecryptedToken(clientId, 'instagram')
    if (!connection || connection.account.status === 'disconnected') {
      throw new PublishFailure('account_not_connected', 'No Instagram account is connected for this client.')
    }
    let account = connection.account
    let accessToken = connection.accessToken
    if (account.status === 'expired') {
      throw new PublishFailure('token_expired', 'The Instagram connection has expired. Reconnect the account.')
    }
    if (account.status === 'revoked') {
      throw new PublishFailure('permission_revoked', 'Instagram access was revoked. Reconnect the account.')
    }
    if (service.mode === 'live' && isMockId(account.providerAccountId)) {
      throw new PublishFailure(
        'account_not_connected',
        'The connected account is a development mock. Reconnect a real Instagram account.',
      )
    }
    if (isExpired(account)) {
      await markAccountUnusable(repo, account, 'expired')
      throw new PublishFailure('token_expired', 'The Instagram access token has expired. Reconnect the account.')
    }
    // Auth errors from the refresh propagate; the catch below marks the account expired/revoked.
    const fresh = await refreshIfNeeded(repo, service, account, accessToken, INLINE_REFRESH_WINDOW_MS)
    account = fresh.account
    accessToken = fresh.accessToken

    const result = await publishByFormat(service, post, {
      accessToken,
      igUserId: account.providerAccountId,
      existingContainerId: post.publishing?.containerId ?? null,
      onContainerCreated: (containerId) => saveContainerId(postId, lockId, containerId),
      processingDeadlineMs: PROCESSING_DEADLINE_MS,
    })

    let permalink: string | null = null
    if (result.mediaId) {
      try {
        permalink = await service.getPermalink(result.mediaId, accessToken)
      } catch (error) {
        logger.warn('instagram_permalink_failed', {postId, mediaId: result.mediaId, error})
      }
    }
    const written = await markPublished(
      postId,
      lockId,
      {attempt, startedAt, mode: result.mode, trigger},
      {
        mediaId: result.mediaId,
        permalink,
        ...(result.alreadyPublished ? {message: 'Published; media ID could not be recovered'} : {}),
      },
    )
    if (!written) {
      logger.error('publish_result_not_saved_lock_lost', {postId, lockId, mediaId: result.mediaId, containerId: result.containerId})
    } else {
      await tickPostWorkflows(postId)
    }
    logger.info('publish_succeeded', {
      postId,
      lockId,
      trigger,
      mode: result.mode,
      mediaId: result.mediaId,
      alreadyPublished: result.alreadyPublished,
    })
    return {
      outcome: 'published',
      instagramMediaId: result.mediaId,
      permalink,
      mode: result.mode,
      alreadyPublished: result.alreadyPublished,
    }
  } catch (error) {
    if (error instanceof LockLostError) {
      logger.warn('publish_aborted_lock_lost', {postId, lockId})
      return {outcome: 'lock_lost'}
    }
    const failure = toFailureInfo(error)
    logger.error('publish_failed', {postId, lockId, trigger, mode, errorCode: failure.code, error})

    if (repo && (failure.code === 'token_expired' || failure.code === 'permission_revoked') && post.clientId) {
      try {
        const account = await repo.getByClient(post.clientId, 'instagram')
        if (account && account.status === 'connected') {
          await markAccountUnusable(repo, account, failure.code === 'permission_revoked' ? 'revoked' : 'expired')
        }
      } catch (markError) {
        logger.error('mark_account_unusable_failed', {postId, error: markError})
      }
    }

    try {
      const written = await markFailed(postId, lockId, {attempt, startedAt, mode, trigger}, failure)
      if (!written) logger.warn('publish_failure_not_saved_lock_lost', {postId, lockId})
    } catch (writeError) {
      // The stale-lock recovery in the scheduler will eventually mark it failed with `timeout`.
      logger.error('publish_failure_write_failed', {postId, lockId, error: writeError})
    }
    return {outcome: 'failed', errorCode: failure.code, message: failure.message, retryable: failure.retryable}
  }
}
