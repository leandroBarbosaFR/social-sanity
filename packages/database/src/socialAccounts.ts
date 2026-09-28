import type {ServiceClient} from './client'
import {decryptToken, encryptToken, type EncryptionKey} from './crypto'
import {DatabaseError} from './errors'
import type {SocialAccountRow, SocialAccountStatus, SocialProvider} from './types'

/** A social account without any token material. Safe to pass around the server (never to browsers verbatim). */
export interface SocialAccountSummary {
  id: string
  organizationId: string
  clientId: string
  provider: SocialProvider
  providerAccountId: string
  username: string | null
  accountType: string | null
  tokenKeyVersion: number
  tokenExpiresAt: string | null
  tokenRefreshedAt: string | null
  scopes: string[]
  status: SocialAccountStatus
  createdAt: string
  updatedAt: string
}

export interface UpsertConnectionInput {
  organizationId: string
  clientId: string
  provider: SocialProvider
  providerAccountId: string
  username: string | null
  accountType: string | null
  accessToken: string
  tokenExpiresAt: Date | null
  scopes: readonly string[]
}

/** Columns selected for summaries: deliberately excludes encrypted_access_token. */
const SUMMARY_COLUMNS =
  'id, organization_id, client_id, provider, provider_account_id, username, account_type, token_key_version, token_expires_at, token_refreshed_at, scopes, status, created_at, updated_at'

type SummaryRow = Omit<SocialAccountRow, 'encrypted_access_token'>

function toSummary(row: SummaryRow): SocialAccountSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    username: row.username,
    accountType: row.account_type,
    tokenKeyVersion: row.token_key_version,
    tokenExpiresAt: row.token_expires_at,
    tokenRefreshedAt: row.token_refreshed_at,
    scopes: row.scopes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SocialAccountsRepository {
  readonly #db: ServiceClient
  readonly #key: EncryptionKey | null

  /** @param key - Required for any method that reads or writes tokens. */
  constructor(db: ServiceClient, key: EncryptionKey | null) {
    this.#db = db
    this.#key = key
  }

  #requireKey(): EncryptionKey {
    if (!this.#key) throw new Error('Token encryption key is required for this operation.')
    return this.#key
  }

  /** Creates or replaces the connection for (client, provider). */
  async upsertConnection(input: UpsertConnectionInput): Promise<SocialAccountSummary> {
    const key = this.#requireKey()
    const now = new Date().toISOString()
    const encrypted = encryptToken(input.accessToken, key, {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
    })
    const {data, error} = await this.#db
      .from('social_accounts')
      .upsert(
        {
          organization_id: input.organizationId,
          client_id: input.clientId,
          provider: input.provider,
          provider_account_id: input.providerAccountId,
          username: input.username,
          account_type: input.accountType,
          encrypted_access_token: encrypted,
          token_key_version: key.version,
          token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
          token_refreshed_at: now,
          scopes: [...input.scopes],
          status: 'connected',
        },
        {onConflict: 'client_id,provider'},
      )
      .select(SUMMARY_COLUMNS)
      .single()
    if (error) throw new DatabaseError('upsert social account', error)
    return toSummary(data)
  }

  async getByClient(clientId: string, provider: SocialProvider): Promise<SocialAccountSummary | null> {
    const {data, error} = await this.#db
      .from('social_accounts')
      .select(SUMMARY_COLUMNS)
      .eq('client_id', clientId)
      .eq('provider', provider)
      .maybeSingle()
    if (error) throw new DatabaseError('read social account', error)
    return data ? toSummary(data) : null
  }

  /** Server-only: returns the decrypted access token. Never log or return the result to a browser. */
  async getDecryptedToken(
    clientId: string,
    provider: SocialProvider,
  ): Promise<{account: SocialAccountSummary; accessToken: string} | null> {
    const key = this.#requireKey()
    const {data, error} = await this.#db
      .from('social_accounts')
      .select('*')
      .eq('client_id', clientId)
      .eq('provider', provider)
      .maybeSingle()
    if (error) throw new DatabaseError('read social account token', error)
    if (!data) return null
    const {encrypted_access_token: encrypted, ...rest} = data
    const accessToken = decryptToken(encrypted, key, {provider: data.provider, providerAccountId: data.provider_account_id})
    return {account: toSummary(rest), accessToken}
  }

  async markStatus(id: string, status: SocialAccountStatus): Promise<void> {
    const {error} = await this.#db.from('social_accounts').update({status}).eq('id', id)
    if (error) throw new DatabaseError('update social account status', error)
  }

  /** Stores a refreshed token for an existing account. */
  async updateToken(
    account: Pick<SocialAccountSummary, 'id' | 'provider' | 'providerAccountId'>,
    token: {accessToken: string; expiresAt: Date | null},
  ): Promise<SocialAccountSummary> {
    const key = this.#requireKey()
    const encrypted = encryptToken(token.accessToken, key, {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    })
    const {data, error} = await this.#db
      .from('social_accounts')
      .update({
        encrypted_access_token: encrypted,
        token_key_version: key.version,
        token_expires_at: token.expiresAt?.toISOString() ?? null,
        token_refreshed_at: new Date().toISOString(),
        status: 'connected',
      })
      .eq('id', account.id)
      .select(SUMMARY_COLUMNS)
      .single()
    if (error) throw new DatabaseError('update social account token', error)
    return toSummary(data)
  }

  /** Deletes the connection (and its token). Returns the deleted account, if any. */
  async disconnect(clientId: string, provider: SocialProvider): Promise<SocialAccountSummary | null> {
    const {data, error} = await this.#db
      .from('social_accounts')
      .delete()
      .eq('client_id', clientId)
      .eq('provider', provider)
      .select(SUMMARY_COLUMNS)
      .maybeSingle()
    if (error) throw new DatabaseError('delete social account', error)
    return data ? toSummary(data) : null
  }

  /** Connected accounts whose token expires before `before` (including already expired ones). */
  async listExpiring(provider: SocialProvider, before: Date, limit = 200): Promise<SocialAccountSummary[]> {
    const {data, error} = await this.#db
      .from('social_accounts')
      .select(SUMMARY_COLUMNS)
      .eq('provider', provider)
      .eq('status', 'connected')
      .not('token_expires_at', 'is', null)
      .lt('token_expires_at', before.toISOString())
      .order('token_expires_at', {ascending: true})
      .limit(limit)
    if (error) throw new DatabaseError('list expiring social accounts', error)
    return data.map(toSummary)
  }
}
