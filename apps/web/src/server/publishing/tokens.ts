import 'server-only'
import type {SocialAccountSummary, SocialAccountsRepository} from '@social-studio/database'
import {InstagramApiError, isMockId, type InstagramService} from '@social-studio/instagram'
import {updateInstagramStatus} from '../clients'
import {logger} from '../log'

const DAY_MS = 24 * 60 * 60 * 1000

/** Meta only refreshes long-lived tokens that are at least 24 hours old. */
export function isRefreshable(account: SocialAccountSummary, now = Date.now()): boolean {
  const issuedAt = Date.parse(account.tokenRefreshedAt ?? account.createdAt)
  return Number.isFinite(issuedAt) && now - issuedAt >= DAY_MS
}

export function isExpired(account: SocialAccountSummary, now = Date.now()): boolean {
  return account.tokenExpiresAt !== null && Date.parse(account.tokenExpiresAt) <= now
}

export function expiresWithin(account: SocialAccountSummary, ms: number, now = Date.now()): boolean {
  return account.tokenExpiresAt !== null && Date.parse(account.tokenExpiresAt) - now <= ms
}

/** Marks the account (Supabase) and the mirrored summary (Sanity) as expired or revoked. Best effort on Sanity. */
export async function markAccountUnusable(
  repo: SocialAccountsRepository,
  account: SocialAccountSummary,
  status: 'expired' | 'revoked',
): Promise<void> {
  await repo.markStatus(account.id, status)
  try {
    await updateInstagramStatus(account.clientId, {status})
  } catch (error) {
    logger.error('client_instagram_status_update_failed', {clientId: account.clientId, status, error})
  }
}

/**
 * Refreshes the token when it expires within `windowMs` and is refreshable. Returns the token to use.
 * Refresh failures that are not auth errors are logged and the current token is kept.
 */
export async function refreshIfNeeded(
  repo: SocialAccountsRepository,
  service: InstagramService,
  account: SocialAccountSummary,
  accessToken: string,
  windowMs: number,
): Promise<{account: SocialAccountSummary; accessToken: string; refreshed: boolean}> {
  if (isMockId(account.providerAccountId) || !expiresWithin(account, windowMs) || !isRefreshable(account)) {
    return {account, accessToken, refreshed: false}
  }
  try {
    const token = await service.refreshToken(accessToken)
    const updated = await repo.updateToken(account, {accessToken: token.accessToken, expiresAt: token.expiresAt})
    try {
      await updateInstagramStatus(account.clientId, {status: 'connected', tokenExpiresAt: token.expiresAt.toISOString()})
    } catch (error) {
      logger.error('client_instagram_status_update_failed', {clientId: account.clientId, error})
    }
    logger.info('instagram_token_refreshed', {socialAccountId: account.id, expiresAt: token.expiresAt.toISOString()})
    return {account: updated, accessToken: token.accessToken, refreshed: true}
  } catch (error) {
    if (error instanceof InstagramApiError && (error.code === 'token_expired' || error.code === 'permission_revoked')) {
      throw error
    }
    logger.warn('instagram_token_refresh_failed', {socialAccountId: account.id, error})
    return {account, accessToken, refreshed: false}
  }
}
