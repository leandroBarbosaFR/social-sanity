/** Types for the Instagram API with Instagram Login (graph.instagram.com). */

export const GRAPH_API_VERSION = 'v25.0'
export const GRAPH_BASE_URL = 'https://graph.instagram.com'
export const OAUTH_AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize'
export const OAUTH_TOKEN_URL = 'https://api.instagram.com/oauth/access_token'

/** Scopes required to read the profile and publish content. */
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'] as const

export type InstagramMode = 'live' | 'mock'

/** Only professional accounts can publish through the API. */
export type ProfessionalAccountType = 'BUSINESS' | 'MEDIA_CREATOR'

export function isProfessionalAccountType(value: string): value is ProfessionalAccountType {
  return value === 'BUSINESS' || value === 'MEDIA_CREATOR'
}

export interface InstagramAppConfig {
  appId: string
  appSecret: string
  redirectUri: string
}

export interface InstagramAccount {
  /** Instagram professional account ID (the `{ig-user-id}` used for publishing). */
  userId: string
  username: string
  /** Raw value from Meta, e.g. BUSINESS, MEDIA_CREATOR or PERSONAL. */
  accountType: string
  profilePictureUrl: string | null
}

export interface ShortLivedToken {
  accessToken: string
  userId: string
  permissions: string[]
}

export interface LongLivedToken {
  accessToken: string
  tokenType: string
  expiresIn: number
  expiresAt: Date
}

export interface ConnectedAccount {
  account: InstagramAccount
  token: LongLivedToken
  scopes: string[]
}

export type ContainerStatusCode = 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'

export interface ContainerStatus {
  statusCode: ContainerStatusCode
  /** Human-readable detail Meta returns alongside ERROR. */
  status: string | null
}

export interface PublishingLimit {
  quotaUsage: number
  quotaTotal: number
}

export interface MediaInput {
  kind: 'image' | 'video'
  url: string
  altText?: string | null
}

/** Parameters for a single `POST /{ig-user-id}/media` call. */
export type CreateContainerParams =
  | {type: 'image'; imageUrl: string; caption?: string; altText?: string | null}
  | {type: 'reel'; videoUrl: string; caption?: string; coverUrl?: string | null; shareToFeed?: boolean}
  | {type: 'story'; imageUrl: string}
  | {type: 'story'; videoUrl: string}
  | {type: 'carouselItem'; imageUrl: string}
  | {type: 'carouselItem'; videoUrl: string}
  | {type: 'carousel'; children: readonly string[]; caption?: string}

export interface AuthContext {
  accessToken: string
  igUserId: string
}

export interface PublishOptions extends AuthContext {
  /**
   * A container created by a previous attempt. It is polled first; if it is already PUBLISHED the
   * result is `alreadyPublished` and nothing is published again.
   */
  existingContainerId?: string | null
  /** Called with the container that will be published, BEFORE `media_publish`, so the caller can persist it. */
  onContainerCreated?: (containerId: string) => void | Promise<void>
  /** Overall deadline for waiting on container processing, in ms. */
  processingDeadlineMs?: number
}

export interface PublishResult {
  /** Instagram media ID; null when the container was already published by an earlier attempt. */
  mediaId: string | null
  containerId: string
  alreadyPublished: boolean
  mode: InstagramMode
}

export interface InstagramService {
  readonly mode: InstagramMode
  getAuthorizeUrl(state: string): string
  /** Exchanges an authorization code for a long-lived token and loads the account profile. */
  connectAccount(code: string): Promise<ConnectedAccount>
  refreshToken(accessToken: string): Promise<LongLivedToken>
  getAccount(accessToken: string): Promise<InstagramAccount>
  createMediaContainer(auth: AuthContext, params: CreateContainerParams): Promise<string>
  publishMedia(input: {image: MediaInput; caption: string}, options: PublishOptions): Promise<PublishResult>
  publishCarousel(input: {items: readonly MediaInput[]; caption: string}, options: PublishOptions): Promise<PublishResult>
  publishReel(
    input: {video: MediaInput; caption: string; coverUrl?: string | null; shareToFeed?: boolean},
    options: PublishOptions,
  ): Promise<PublishResult>
  publishStory(input: {media: MediaInput}, options: PublishOptions): Promise<PublishResult>
  getPublishingStatus(containerId: string, accessToken: string): Promise<ContainerStatus>
  getPermalink(mediaId: string, accessToken: string): Promise<string | null>
  getPublishingLimit(auth: AuthContext): Promise<PublishingLimit>
}
