import type {ValidationIssue} from './post'

/**
 * Contracts between the Sanity app and the Next.js backend (`apps/web`).
 * The browser only ever receives these shapes; tokens never cross this boundary.
 */

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
  }
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'meta_not_configured'
  | 'supabase_not_configured'
  | 'sanity_not_configured'
  | 'encryption_not_configured'
  | 'publish_rejected'
  | 'ai_not_configured'
  | 'ai_unavailable'
  | 'internal_error'

/** GET /api/health — which server integrations are configured (booleans only). */
export interface IntegrationStatusResponse {
  sanity: boolean
  supabase: boolean
  meta: boolean
  encryption: boolean
  /** Content Agent (caption drafts, assistant) is configured. */
  contentAgent: boolean
  /** `mock` only in development when INSTAGRAM_API_MODE=mock. */
  instagramMode: 'live' | 'mock' | 'unconfigured'
}

/** POST /api/auth/instagram/start */
export interface StartInstagramConnectRequest {
  clientId: string
}

export interface StartInstagramConnectResponse {
  /** First-party URL on the backend to open in a new window; it sets the CSRF cookie and redirects to Meta. */
  authorizeUrl: string
  expiresAt: string
}

/** POST /api/clients/:clientId/instagram/disconnect */
export interface DisconnectInstagramResponse {
  disconnected: true
}

/** POST /api/posts/:postId/publish */
export interface PublishNowRequest {
  /** Required when the post is not approved/scheduled/failed. */
  confirmUnapproved?: boolean
}

export type PublishNowResponse =
  | {outcome: 'published'; instagramMediaId: string | null; permalink: string | null; mode: 'live' | 'mock'}
  | {outcome: 'failed'; errorCode: string; message: string}
  | {outcome: 'already_published'}
  | {outcome: 'in_progress'}

/**
 * POST /api/posts/:postId/caption — Content Agent drafts a caption and hashtags from the post, its
 * campaign and the client's brand guidelines. Read-only: the app puts the suggestion into the
 * editor, and nothing is saved until the user saves.
 */
export interface GenerateCaptionRequest {
  /** Optional direction from the user, e.g. "playful, mention the launch date". */
  brief?: string
}

export interface GenerateCaptionResponse {
  caption: string
  /** Without the leading #, normalised like hand-entered hashtags. */
  hashtags: string[]
}

/**
 * POST /api/ai/chat — one turn of the Content Agent assistant, streamed as an AI SDK UI message
 * stream. Conversation history lives server-side in the Content Agent thread, so only the new
 * message is sent.
 */
export interface AssistantChatRequest {
  /** Client-generated conversation ID; the backend scopes it to the signed-in user. */
  threadId: string
  message: string
  /** The post open in the editor, if any, given to the agent as context. */
  postId?: string
}

/** Sanity Studio workspace Content Agent resolves its application from (apps/studio `name`). */
export const CONTENT_AGENT_WORKSPACE = 'social-studio'

/** Non-secret connection summary mirrored on the Sanity client document. */
export interface InstagramConnectionSummary {
  socialAccountId: string
  providerAccountId: string
  username: string
  accountType: 'BUSINESS' | 'MEDIA_CREATOR'
  status: 'connected' | 'expired' | 'revoked'
  connectedAt: string
  tokenExpiresAt: string | null
  mode?: 'live' | 'mock'
}

/**
 * Error body for `publish_rejected` from POST /api/posts/:postId/publish.
 * `issues` is present for validation failures (HTTP 400); `requiresConfirmation` when the post is
 * not approved and `confirmUnapproved` was not sent (HTTP 409).
 */
export interface PublishRejectedErrorBody extends ApiErrorBody {
  issues?: ValidationIssue[]
  requiresConfirmation?: boolean
}

/** POST /api/internal/publish (HMAC-signed, Sanity Functions → backend). */
export interface InternalPublishRequest {
  postId: string
  lockId: string
}
