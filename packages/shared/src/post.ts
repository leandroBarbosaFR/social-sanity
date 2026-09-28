import {INSTAGRAM_LIMITS, type Platform, type PostFormat} from './formats'
import type {PublishingErrorCode} from './errors'
import type {WorkflowStatus} from './workflow'

/** A media item as resolved for validation, preview and publishing. */
export interface ResolvedMediaItem {
  _key: string
  kind: 'image' | 'video'
  url: string | null
  mimeType?: string | null
  alt?: string | null
}

export interface PublishingError {
  code: PublishingErrorCode
  message: string
  retryable: boolean
  occurredAt: string
  /** Meta error code/subcode when the failure came from the Graph API. */
  providerCode?: string
}

/** Current publishing run: the lock that makes publishing idempotent. */
export interface PublishingState {
  lockId: string
  startedAt: string
  attempt: number
  /** Instagram container ID, saved before `media_publish` so a retry never publishes twice. */
  containerId?: string
  mode?: 'live' | 'mock'
}

export interface PublishingHistoryEntry {
  _key: string
  attempt: number
  startedAt: string
  finishedAt?: string
  outcome: 'published' | 'failed'
  errorCode?: PublishingErrorCode
  message?: string
  mode?: 'live' | 'mock'
  trigger: 'schedule' | 'manual'
}

export interface PostForValidation {
  title?: string | null
  clientId?: string | null
  platforms?: readonly Platform[] | null
  format?: PostFormat | null
  caption?: string | null
  hashtags?: readonly string[] | null
  media: readonly ResolvedMediaItem[]
  coverImageUrl?: string | null
  scheduledAt?: string | null
  workflowStatus?: WorkflowStatus | null
}

export interface ValidationIssue {
  field: 'title' | 'client' | 'platforms' | 'format' | 'caption' | 'hashtags' | 'media' | 'scheduledAt'
  message: string
}

const HASHTAG_PATTERN = /^[\p{L}\p{N}_]+$/u

/** Normalises a hashtag entry: trims, strips a leading #, rejects spaces/punctuation. */
export function normalizeHashtag(input: string): string | null {
  const tag = input.trim().replace(/^#+/, '')
  return tag && HASHTAG_PATTERN.test(tag) ? tag : null
}

/** Caption plus hashtags as they are sent to Instagram. */
export function composeCaption(caption: string | null | undefined, hashtags: readonly string[] | null | undefined): string {
  const tags = (hashtags ?? []).map((tag) => `#${tag}`).join(' ')
  return [caption?.trim() ?? '', tags].filter(Boolean).join('\n\n')
}

function validateMedia(format: PostFormat, media: readonly ResolvedMediaItem[]): string | null {
  const missingUrl = media.some((item) => !item.url)
  if (missingUrl) return 'A media item has no uploaded file.'
  const images = media.filter((item) => item.kind === 'image').length
  const videos = media.filter((item) => item.kind === 'video').length

  switch (format) {
    case 'image':
      if (media.length !== 1 || images !== 1) return 'An image post needs exactly one image.'
      return null
    case 'carousel':
      if (media.length < INSTAGRAM_LIMITS.carouselMinItems)
        return `A carousel needs at least ${INSTAGRAM_LIMITS.carouselMinItems} items.`
      if (media.length > INSTAGRAM_LIMITS.carouselMaxItems)
        return `A carousel can have at most ${INSTAGRAM_LIMITS.carouselMaxItems} items.`
      return null
    case 'reel':
      if (media.length !== 1 || videos !== 1) return 'A Reel needs exactly one video.'
      return null
    case 'story':
      if (media.length !== 1) return 'A Story needs exactly one image or video.'
      return null
    default:
      return 'Unknown format.'
  }
}

/**
 * Checks everything that must be true before a post can be scheduled or published.
 * Used by the app to disable actions and by the server as the authoritative gate.
 */
export function validatePostForPublishing(post: PostForValidation, options: {requireSchedule?: boolean; now?: Date} = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!post.title?.trim()) issues.push({field: 'title', message: 'Add a title.'})
  if (!post.clientId) issues.push({field: 'client', message: 'Select a client.'})
  if (!post.platforms?.length) issues.push({field: 'platforms', message: 'Select at least one platform.'})
  if (!post.format) {
    issues.push({field: 'format', message: 'Select a format.'})
  } else {
    const mediaIssue = validateMedia(post.format, post.media)
    if (mediaIssue) issues.push({field: 'media', message: mediaIssue})
    if (post.format !== 'story' && !post.caption?.trim()) {
      issues.push({field: 'caption', message: 'Add a caption.'})
    }
  }

  const captionLength = composeCaption(post.caption, post.hashtags).length
  if (captionLength > INSTAGRAM_LIMITS.captionMaxLength) {
    issues.push({
      field: 'caption',
      message: `Caption and hashtags are ${captionLength} characters; Instagram allows ${INSTAGRAM_LIMITS.captionMaxLength}.`,
    })
  }
  if ((post.hashtags?.length ?? 0) > INSTAGRAM_LIMITS.hashtagsMax) {
    issues.push({field: 'hashtags', message: `Instagram allows at most ${INSTAGRAM_LIMITS.hashtagsMax} hashtags.`})
  }

  if (options.requireSchedule) {
    if (!post.scheduledAt) {
      issues.push({field: 'scheduledAt', message: 'Pick a publish date and time.'})
    } else if (new Date(post.scheduledAt).getTime() <= (options.now ?? new Date()).getTime()) {
      issues.push({field: 'scheduledAt', message: 'The scheduled time is in the past.'})
    }
  }
  return issues
}
