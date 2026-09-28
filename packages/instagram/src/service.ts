import {
  buildAuthorizeUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getAccount,
  refreshToken,
} from './auth'
import {
  createMediaContainer,
  getPermalink,
  getPublishingLimit,
  getPublishingStatus,
  publishCarousel,
  publishMedia,
  publishReel,
  publishStory,
} from './publish'
import type {ConnectedAccount, InstagramAppConfig, InstagramService} from './types'

/** Live implementation backed by graph.instagram.com. */
export class LiveInstagramService implements InstagramService {
  readonly mode = 'live' as const
  readonly #config: InstagramAppConfig

  constructor(config: InstagramAppConfig) {
    this.#config = config
  }

  getAuthorizeUrl(state: string): string {
    return buildAuthorizeUrl(this.#config, state)
  }

  async connectAccount(code: string): Promise<ConnectedAccount> {
    const shortLived = await exchangeCodeForShortLivedToken(this.#config, code)
    const token = await exchangeForLongLivedToken(this.#config, shortLived.accessToken)
    const account = await getAccount(token.accessToken)
    return {account, token, scopes: shortLived.permissions}
  }

  refreshToken = refreshToken
  getAccount = getAccount
  createMediaContainer = createMediaContainer
  publishMedia = publishMedia
  publishCarousel = publishCarousel
  publishReel = publishReel
  publishStory = publishStory
  getPublishingStatus = getPublishingStatus
  getPermalink = getPermalink
  getPublishingLimit = getPublishingLimit
}
