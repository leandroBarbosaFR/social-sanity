import type {Platform, PostFormat, PublishingError, PublishingHistoryEntry, PublishingState, WorkflowStatus} from '@social-studio/shared'

import type {MediaValue} from './assets'

export interface Reference {
  _type: 'reference'
  _ref: string
}

export interface UserStampValue {
  sanityUserId?: string
  name?: string
}

/** The socialPost document as read by the editor. */
export interface PostDocument {
  _id: string
  _type: 'socialPost'
  _updatedAt?: string
  title?: string
  client?: Reference
  campaign?: Reference
  platforms?: Platform[]
  format?: PostFormat
  caption?: string
  hashtags?: string[]
  media?: MediaValue[]
  coverImage?: {asset?: {_ref?: string}}
  workflowStatus?: WorkflowStatus
  scheduledAt?: string
  publishedAt?: string
  instagramMediaId?: string
  instagramPermalink?: string
  publishingError?: PublishingError
  publishingAttempts?: number
  publishing?: PublishingState
  publishingHistory?: PublishingHistoryEntry[]
  createdBy?: UserStampValue
  approvedBy?: UserStampValue
  approvedAt?: string
}
