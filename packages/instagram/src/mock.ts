/**
 * ─── DEVELOPMENT MOCK ───────────────────────────────────────────────────────────────────────
 * MockInstagramClient implements InstagramService without any network access. IDs are
 * deterministic and prefixed `mock_`; permalinks are null because nothing is on Instagram.
 * Results are always flagged `mode: 'mock'` so callers never present them as live.
 * The host application must refuse to use this in production.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 */
import {createHash} from 'node:crypto'
import {InstagramApiError} from './errors'
import type {
  AuthContext,
  ConnectedAccount,
  ContainerStatus,
  CreateContainerParams,
  InstagramAccount,
  InstagramService,
  LongLivedToken,
  MediaInput,
  PublishingLimit,
  PublishOptions,
  PublishResult,
} from './types'

export const MOCK_ACCESS_TOKEN = 'mock-token'
export const MOCK_ID_PREFIX = 'mock_'
const SIXTY_DAYS_S = 60 * 24 * 60 * 60

function digest(value: string, length = 16): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length)
}

export function isMockId(id: string): boolean {
  return id.startsWith(MOCK_ID_PREFIX)
}

/** Published containers survive across instances within one server process. */
const publishedContainers = new Map<string, string>()

export class MockInstagramClient implements InstagramService {
  readonly mode = 'mock' as const
  readonly #redirectUri: string

  /** @param options.redirectUri - The app's OAuth callback; the mock "authorize" URL points straight at it. */
  constructor(options: {redirectUri: string}) {
    this.#redirectUri = options.redirectUri
  }

  getAuthorizeUrl(state: string): string {
    const url = new URL(this.#redirectUri)
    url.searchParams.set('code', `${MOCK_ID_PREFIX}code`)
    url.searchParams.set('state', state)
    return url.toString()
  }

  async connectAccount(code: string): Promise<ConnectedAccount> {
    const account = await this.getAccount(code)
    return {account, token: this.#token(), scopes: ['instagram_business_basic', 'instagram_business_content_publish']}
  }

  async refreshToken(): Promise<LongLivedToken> {
    return this.#token()
  }

  async getAccount(seed: string): Promise<InstagramAccount> {
    const id = digest(seed, 10)
    return {userId: `${MOCK_ID_PREFIX}${id}`, username: `${MOCK_ID_PREFIX}${id}`, accountType: 'BUSINESS', profilePictureUrl: null}
  }

  async createMediaContainer(auth: AuthContext, params: CreateContainerParams): Promise<string> {
    return `${MOCK_ID_PREFIX}container_${digest(`${auth.igUserId}:${JSON.stringify(params)}`)}`
  }

  async getPublishingStatus(containerId: string): Promise<ContainerStatus> {
    if (!isMockId(containerId)) {
      throw new InstagramApiError({
        code: 'unknown',
        message: `Container ${containerId} is not a mock container.`,
        httpStatus: 400,
        retryable: false,
      })
    }
    return {statusCode: publishedContainers.has(containerId) ? 'PUBLISHED' : 'FINISHED', status: null}
  }

  async getPermalink(): Promise<string | null> {
    return null
  }

  async getPublishingLimit(): Promise<PublishingLimit> {
    return {quotaUsage: 0, quotaTotal: 100}
  }

  publishMedia(input: {image: MediaInput; caption: string}, options: PublishOptions): Promise<PublishResult> {
    return this.#publish(options, {type: 'image', imageUrl: input.image.url, caption: input.caption})
  }

  publishCarousel(input: {items: readonly MediaInput[]; caption: string}, options: PublishOptions): Promise<PublishResult> {
    const children = input.items.map((item) => `${MOCK_ID_PREFIX}child_${digest(item.url)}`)
    return this.#publish(options, {type: 'carousel', children, caption: input.caption})
  }

  publishReel(input: {video: MediaInput; caption: string}, options: PublishOptions): Promise<PublishResult> {
    return this.#publish(options, {type: 'reel', videoUrl: input.video.url, caption: input.caption})
  }

  publishStory(input: {media: MediaInput}, options: PublishOptions): Promise<PublishResult> {
    return this.#publish(
      options,
      input.media.kind === 'image' ? {type: 'story', imageUrl: input.media.url} : {type: 'story', videoUrl: input.media.url},
    )
  }

  async #publish(options: PublishOptions, params: CreateContainerParams): Promise<PublishResult> {
    let containerId = options.existingContainerId && isMockId(options.existingContainerId) ? options.existingContainerId : null
    if (containerId && publishedContainers.has(containerId)) {
      return {mediaId: null, containerId, alreadyPublished: true, mode: 'mock'}
    }
    if (!containerId) {
      containerId = await this.createMediaContainer(options, params)
      await options.onContainerCreated?.(containerId)
    }
    const mediaId = `${MOCK_ID_PREFIX}media_${digest(containerId)}`
    publishedContainers.set(containerId, mediaId)
    return {mediaId, containerId, alreadyPublished: false, mode: 'mock'}
  }

  #token(): LongLivedToken {
    return {
      accessToken: MOCK_ACCESS_TOKEN,
      tokenType: 'bearer',
      expiresIn: SIXTY_DAYS_S,
      expiresAt: new Date(Date.now() + SIXTY_DAYS_S * 1000),
    }
  }
}
