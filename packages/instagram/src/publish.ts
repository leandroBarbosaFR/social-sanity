import {INSTAGRAM_LIMITS} from '@social-studio/shared'
import {asObject, readNumber, readOptionalString, readString, requestJson} from './client'
import {classifyMetaError, InstagramApiError} from './errors'
import type {
  AuthContext,
  ContainerStatus,
  ContainerStatusCode,
  CreateContainerParams,
  MediaInput,
  PublishingLimit,
  PublishOptions,
  PublishResult,
} from './types'

/** Default overall deadline for container processing (keeps a run inside a 300 s serverless limit). */
export const DEFAULT_PROCESSING_DEADLINE_MS = 180_000
const INITIAL_POLL_DELAY_MS = 1_500
const MAX_POLL_DELAY_MS = 15_000

const STATUS_CODES: readonly ContainerStatusCode[] = ['EXPIRED', 'ERROR', 'FINISHED', 'IN_PROGRESS', 'PUBLISHED']

function isStatusCode(value: string): value is ContainerStatusCode {
  return (STATUS_CODES as readonly string[]).includes(value)
}

function containerForm(params: CreateContainerParams): Record<string, string | undefined> {
  switch (params.type) {
    case 'image':
      return {image_url: params.imageUrl, caption: params.caption, alt_text: params.altText ?? undefined}
    case 'reel':
      return {
        media_type: 'REELS',
        video_url: params.videoUrl,
        caption: params.caption,
        cover_url: params.coverUrl ?? undefined,
        share_to_feed: params.shareToFeed === undefined ? undefined : String(params.shareToFeed),
      }
    case 'story':
      return 'imageUrl' in params
        ? {media_type: 'STORIES', image_url: params.imageUrl}
        : {media_type: 'STORIES', video_url: params.videoUrl}
    case 'carouselItem':
      return 'imageUrl' in params
        ? {is_carousel_item: 'true', image_url: params.imageUrl}
        : {is_carousel_item: 'true', media_type: 'VIDEO', video_url: params.videoUrl}
    case 'carousel':
      return {media_type: 'CAROUSEL', children: params.children.join(','), caption: params.caption}
    default: {
      const exhaustive: never = params
      throw new Error(`Unsupported container type: ${JSON.stringify(exhaustive)}`)
    }
  }
}

/** POST /{ig-user-id}/media → container ID. */
export async function createMediaContainer(auth: AuthContext, params: CreateContainerParams): Promise<string> {
  if (params.type === 'carousel' && params.children.length > INSTAGRAM_LIMITS.carouselMaxItems) {
    throw new InstagramApiError({
      code: 'invalid_media',
      message: `A carousel can have at most ${INSTAGRAM_LIMITS.carouselMaxItems} items.`,
    })
  }
  const body = await requestJson({
    method: 'POST',
    url: `/${encodeURIComponent(auth.igUserId)}/media`,
    accessToken: auth.accessToken,
    form: containerForm(params),
  })
  return readString(asObject(body), 'id')
}

/** GET /{container-id}?fields=status_code,status */
export async function getPublishingStatus(containerId: string, accessToken: string): Promise<ContainerStatus> {
  const body = await requestJson({
    method: 'GET',
    url: `/${encodeURIComponent(containerId)}`,
    accessToken,
    query: {fields: 'status_code,status'},
  })
  const obj = asObject(body)
  const statusCode = readString(obj, 'status_code')
  if (!isStatusCode(statusCode)) {
    throw new InstagramApiError({
      code: 'meta_api_error',
      message: `Unexpected container status "${statusCode}".`,
      retryable: true,
    })
  }
  return {statusCode, status: readOptionalString(obj, 'status')}
}

/** POST /{ig-user-id}/media_publish → media ID. */
export async function publishContainer(auth: AuthContext, containerId: string): Promise<string> {
  const body = await requestJson({
    method: 'POST',
    url: `/${encodeURIComponent(auth.igUserId)}/media_publish`,
    accessToken: auth.accessToken,
    form: {creation_id: containerId},
    // media_publish can be slow for video; allow longer than the default.
    timeoutMs: 60_000,
  })
  return readString(asObject(body), 'id')
}

export async function getPermalink(mediaId: string, accessToken: string): Promise<string | null> {
  const body = await requestJson({
    method: 'GET',
    url: `/${encodeURIComponent(mediaId)}`,
    accessToken,
    query: {fields: 'permalink'},
  })
  return readOptionalString(asObject(body), 'permalink')
}

/** GET /{ig-user-id}/content_publishing_limit (100 API-published posts per 24 h). */
export async function getPublishingLimit(auth: AuthContext): Promise<PublishingLimit> {
  const body = await requestJson({
    method: 'GET',
    url: `/${encodeURIComponent(auth.igUserId)}/content_publishing_limit`,
    accessToken: auth.accessToken,
    query: {fields: 'quota_usage,config'},
  })
  const root = asObject(body)
  const first: unknown = Array.isArray(root['data']) ? root['data'][0] : undefined
  if (first === undefined) return {quotaUsage: 0, quotaTotal: INSTAGRAM_LIMITS.publishesPer24h}
  const entry = asObject(first)
  let quotaTotal: number = INSTAGRAM_LIMITS.publishesPer24h
  const config = entry['config']
  if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
    try {
      quotaTotal = readNumber(config as Record<string, unknown>, 'quota_total')
    } catch {
      // keep documented default
    }
  }
  return {quotaUsage: readNumber(entry, 'quota_usage'), quotaTotal}
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Converts a container ERROR status into a classified error. */
function containerError(containerId: string, status: string | null): InstagramApiError {
  const detail = status ?? 'Instagram could not process the media.'
  const match = status?.match(/\b(\d{4,7})\b/)
  if (match?.[1]) {
    const classified = classifyMetaError(400, {error: {message: detail, code: Number(match[1])}})
    if (classified.code !== 'unknown') return classified
  }
  return new InstagramApiError({
    code: 'invalid_media',
    message: `Instagram rejected the media for container ${containerId}: ${detail}`,
  })
}

/**
 * Polls a container with exponential backoff until it is FINISHED or PUBLISHED, or the deadline passes.
 * @returns the terminal status (FINISHED or PUBLISHED)
 */
export async function waitForContainer(
  containerId: string,
  accessToken: string,
  deadline: number,
): Promise<'FINISHED' | 'PUBLISHED'> {
  let delay = INITIAL_POLL_DELAY_MS
  for (;;) {
    const {statusCode, status} = await getPublishingStatus(containerId, accessToken)
    if (statusCode === 'FINISHED' || statusCode === 'PUBLISHED') return statusCode
    if (statusCode === 'ERROR') throw containerError(containerId, status)
    if (statusCode === 'EXPIRED') {
      throw new InstagramApiError({
        code: 'upload_failed',
        message: 'The Instagram media container expired before it was published. Retry to upload again.',
      })
    }
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      throw new InstagramApiError({
        code: 'timeout',
        message: 'Instagram is still processing the media. Retry to resume the same upload.',
      })
    }
    await sleep(Math.min(delay, remaining))
    delay = Math.min(Math.round(delay * 1.5), MAX_POLL_DELAY_MS)
  }
}

/**
 * Shared publish flow: resume or create the container → persist it → wait for FINISHED → media_publish.
 * Never calls media_publish on a container that is already PUBLISHED.
 */
async function runPublishFlow(
  options: PublishOptions,
  createContainer: (deadline: number) => Promise<string>,
): Promise<PublishResult> {
  const auth: AuthContext = {accessToken: options.accessToken, igUserId: options.igUserId}
  const deadline = Date.now() + (options.processingDeadlineMs ?? DEFAULT_PROCESSING_DEADLINE_MS)
  let containerId: string | null = options.existingContainerId ?? null

  if (containerId) {
    let resumable = true
    try {
      const {statusCode} = await getPublishingStatus(containerId, auth.accessToken)
      if (statusCode === 'PUBLISHED') {
        return {mediaId: null, containerId, alreadyPublished: true, mode: 'live'}
      }
      // EXPIRED/ERROR containers were never published, so a fresh one is safe.
      if (statusCode === 'EXPIRED' || statusCode === 'ERROR') resumable = false
    } catch (error) {
      // A container that no longer exists or belongs to another token cannot be resumed;
      // transient failures (network, timeout, 5xx) must not lead to a duplicate publish.
      const notFound =
        error instanceof InstagramApiError &&
        error.httpStatus !== undefined &&
        error.httpStatus >= 400 &&
        error.httpStatus < 500 &&
        (error.code === 'unknown' || error.code === 'invalid_media' || error.code === 'meta_api_error')
      if (notFound) {
        resumable = false
      } else {
        throw error
      }
    }
    if (!resumable) containerId = null
  }

  if (!containerId) {
    containerId = await createContainer(deadline)
    await options.onContainerCreated?.(containerId)
  }

  const final = await waitForContainer(containerId, auth.accessToken, deadline)
  if (final === 'PUBLISHED') return {mediaId: null, containerId, alreadyPublished: true, mode: 'live'}
  const mediaId = await publishContainer(auth, containerId)
  return {mediaId, containerId, alreadyPublished: false, mode: 'live'}
}

function authOf(options: PublishOptions): AuthContext {
  return {accessToken: options.accessToken, igUserId: options.igUserId}
}

/** Single-image feed post. */
export function publishMedia(input: {image: MediaInput; caption: string}, options: PublishOptions): Promise<PublishResult> {
  if (input.image.kind !== 'image') {
    return Promise.reject(new InstagramApiError({code: 'invalid_media', message: 'An image post needs an image.'}))
  }
  return runPublishFlow(options, () =>
    createMediaContainer(authOf(options), {
      type: 'image',
      imageUrl: input.image.url,
      caption: input.caption,
      altText: input.image.altText,
    }),
  )
}

export function publishCarousel(
  input: {items: readonly MediaInput[]; caption: string},
  options: PublishOptions,
): Promise<PublishResult> {
  const {carouselMinItems, carouselMaxItems} = INSTAGRAM_LIMITS
  if (input.items.length < carouselMinItems || input.items.length > carouselMaxItems) {
    return Promise.reject(
      new InstagramApiError({
        code: 'invalid_media',
        message: `A carousel needs ${carouselMinItems}–${carouselMaxItems} items.`,
      }),
    )
  }
  const auth = authOf(options)
  return runPublishFlow(options, async (deadline) => {
    const children: string[] = []
    for (const item of input.items) {
      children.push(
        await createMediaContainer(
          auth,
          item.kind === 'image' ? {type: 'carouselItem', imageUrl: item.url} : {type: 'carouselItem', videoUrl: item.url},
        ),
      )
    }
    // Children (videos in particular) must finish processing before the parent can be created.
    for (const child of children) await waitForContainer(child, auth.accessToken, deadline)
    return createMediaContainer(auth, {type: 'carousel', children, caption: input.caption})
  })
}

export function publishReel(
  input: {video: MediaInput; caption: string; coverUrl?: string | null; shareToFeed?: boolean},
  options: PublishOptions,
): Promise<PublishResult> {
  if (input.video.kind !== 'video') {
    return Promise.reject(new InstagramApiError({code: 'invalid_media', message: 'A Reel needs a video.'}))
  }
  return runPublishFlow(options, () =>
    createMediaContainer(authOf(options), {
      type: 'reel',
      videoUrl: input.video.url,
      caption: input.caption,
      coverUrl: input.coverUrl,
      shareToFeed: input.shareToFeed ?? true,
    }),
  )
}

/** Stories take no caption. */
export function publishStory(input: {media: MediaInput}, options: PublishOptions): Promise<PublishResult> {
  return runPublishFlow(options, () =>
    createMediaContainer(
      authOf(options),
      input.media.kind === 'image'
        ? {type: 'story', imageUrl: input.media.url}
        : {type: 'story', videoUrl: input.media.url},
    ),
  )
}
