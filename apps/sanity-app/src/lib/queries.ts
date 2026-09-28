import type {PostFormat, PublishingError, WorkflowStatus} from '@social-studio/shared'

/**
 * Shared GROQ. Lists use `useDocuments` + `useDocumentProjection`; `useQuery` is reserved for
 * aggregates and date-range views (dashboard, calendar) where a projection per handle can't
 * place or count documents.
 */

export const CLIENT_OPTIONS_QUERY = `*[_type == "client"] | order(lower(name) asc){_id, name, status, "instagram": instagram.username}`

export interface ClientOption {
  _id: string
  name: string | null
  status: string | null
  instagram: string | null
}

export const CAMPAIGN_OPTIONS_QUERY = `*[_type == "campaign" && (!defined($clientId) || client._ref == $clientId)] | order(lower(title) asc){_id, title, "clientId": client._ref}`

export interface CampaignOption {
  _id: string
  title: string | null
  clientId: string | null
}

export const POST_ROW_PROJECTION = `{
  title,
  format,
  workflowStatus,
  scheduledAt,
  platforms,
  _updatedAt,
  "clientName": client->name,
  "campaignTitle": campaign->title,
  "thumbUrl": media[0].asset->url,
  "thumbType": media[0]._type,
  "errorCode": publishingError.code
}`

export interface PostRow {
  title: string | null
  format: PostFormat | null
  workflowStatus: WorkflowStatus | null
  scheduledAt: string | null
  platforms: string[] | null
  _updatedAt: string
  clientName: string | null
  campaignTitle: string | null
  thumbUrl: string | null
  thumbType: string | null
  errorCode: string | null
}

/** Compact post summary for dashboard and calendar views. */
export const POST_SUMMARY_FIELDS = `_id, title, format, workflowStatus, scheduledAt, publishedAt, _updatedAt, platforms,
  "clientId": client._ref, "clientName": client->name, "errorCode": publishingError.code, "errorMessage": publishingError.message`

export interface PostSummary {
  _id: string
  title: string | null
  format: PostFormat | null
  workflowStatus: WorkflowStatus | null
  scheduledAt: string | null
  publishedAt: string | null
  _updatedAt: string
  platforms: string[] | null
  clientId: string | null
  clientName: string | null
  errorCode: string | null
  errorMessage: string | null
}

/** Everything the editor preview and publish checks need, with asset URLs resolved. */
export const POST_EDITOR_PROJECTION = `{
  title,
  format,
  caption,
  hashtags,
  platforms,
  scheduledAt,
  publishedAt,
  workflowStatus,
  instagramMediaId,
  instagramPermalink,
  publishingAttempts,
  publishingError,
  publishing,
  publishingHistory,
  approvedAt,
  approvedBy,
  createdBy,
  "clientId": client._ref,
  "clientName": client->name,
  "clientLogoUrl": client->logo.asset->url,
  "instagram": client->instagram{username, status, mode},
  "media": media[]{_key, _type, alt, "url": asset->url, "mimeType": asset->mimeType},
  "coverImageUrl": coverImage.asset->url
}`

export interface EditorMediaItem {
  _key: string
  _type: 'socialImage' | 'socialVideo'
  alt: string | null
  url: string | null
  mimeType: string | null
}

export interface PublishingHistoryRow {
  _key: string
  attempt: number | null
  trigger: 'schedule' | 'manual' | null
  startedAt: string | null
  finishedAt: string | null
  outcome: 'published' | 'failed' | null
  errorCode: string | null
  message: string | null
  mode: 'live' | 'mock' | null
}

export interface EditorPost {
  title: string | null
  format: PostFormat | null
  caption: string | null
  hashtags: string[] | null
  platforms: string[] | null
  scheduledAt: string | null
  publishedAt: string | null
  workflowStatus: WorkflowStatus | null
  instagramMediaId: string | null
  instagramPermalink: string | null
  publishingAttempts: number | null
  publishingError: PublishingError | null
  publishing: {lockId?: string; startedAt?: string; attempt?: number; containerId?: string; mode?: 'live' | 'mock'} | null
  publishingHistory: PublishingHistoryRow[] | null
  approvedAt: string | null
  approvedBy: {name?: string} | null
  createdBy: {name?: string} | null
  clientId: string | null
  clientName: string | null
  clientLogoUrl: string | null
  instagram: {username: string | null; status: string | null; mode: string | null} | null
  media: EditorMediaItem[] | null
  coverImageUrl: string | null
}
