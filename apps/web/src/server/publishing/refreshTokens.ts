import 'server-only'
import {InstagramApiError, isMockId} from '@social-studio/instagram'
import {updateInstagramStatus} from '../clients'
import {getSocialAccounts} from '../database'
import {getInstagramService} from '../instagram'
import {logger} from '../log'
import {isExpired, isRefreshable, markAccountUnusable} from './tokens'

const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000

export interface RefreshSummary {
  checked: number
  refreshed: number
  expired: number
  revoked: number
  skipped: number
  failed: number
}

/**
 * Refreshes long-lived Instagram tokens expiring within 10 days (and at least 24 h old), and marks
 * already-expired ones. Idempotent: running it twice only refreshes what is still due.
 */
export async function refreshExpiringTokens(): Promise<RefreshSummary> {
  const repo = getSocialAccounts()
  const service = getInstagramService()
  const now = Date.now()
  const accounts = await repo.listExpiring('instagram', new Date(now + REFRESH_WINDOW_MS))
  const summary: RefreshSummary = {checked: accounts.length, refreshed: 0, expired: 0, revoked: 0, skipped: 0, failed: 0}

  for (const account of accounts) {
    try {
      if (isExpired(account, now)) {
        await markAccountUnusable(repo, account, 'expired')
        summary.expired++
        continue
      }
      if (isMockId(account.providerAccountId) || service.mode === 'mock' || !isRefreshable(account, now)) {
        summary.skipped++
        continue
      }
      const connection = await repo.getDecryptedToken(account.clientId, 'instagram')
      if (!connection) {
        summary.skipped++
        continue
      }
      const token = await service.refreshToken(connection.accessToken)
      await repo.updateToken(account, {accessToken: token.accessToken, expiresAt: token.expiresAt})
      try {
        await updateInstagramStatus(account.clientId, {status: 'connected', tokenExpiresAt: token.expiresAt.toISOString()})
      } catch (error) {
        logger.error('client_instagram_status_update_failed', {clientId: account.clientId, error})
      }
      summary.refreshed++
    } catch (error) {
      try {
        if (error instanceof InstagramApiError && error.code === 'token_expired') {
          await markAccountUnusable(repo, account, 'expired')
          summary.expired++
        } else if (error instanceof InstagramApiError && error.code === 'permission_revoked') {
          await markAccountUnusable(repo, account, 'revoked')
          summary.revoked++
        } else {
          logger.error('instagram_token_refresh_failed', {socialAccountId: account.id, error})
          summary.failed++
        }
      } catch (markError) {
        logger.error('instagram_token_mark_failed', {socialAccountId: account.id, error: markError})
        summary.failed++
      }
    }
  }
  logger.info('instagram_token_refresh_run', {...summary})
  return summary
}
