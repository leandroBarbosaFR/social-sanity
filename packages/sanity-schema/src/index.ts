import {brandGuidelines} from './documents/brandGuidelines'
import {campaign} from './documents/campaign'
import {client} from './documents/client'
import {organization} from './documents/organization'
import {socialPost} from './documents/socialPost'
import {
  instagramConnection,
  publishingError,
  publishingHistoryEntry,
  publishingState,
} from './objects/publishing'
import {socialImage, socialVideo} from './objects/socialMedia'
import {userStamp} from './objects/userStamp'

export {CAMPAIGN_STATUSES} from './documents/campaign'

export const schemaTypes = [
  organization,
  client,
  brandGuidelines,
  campaign,
  socialPost,
  socialImage,
  socialVideo,
  userStamp,
  publishingError,
  publishingState,
  publishingHistoryEntry,
  instagramConnection,
]
