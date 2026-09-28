import type {ServiceClient} from './client'
import {DatabaseError} from './errors'
import type {OAuthStateRow, SocialProvider} from './types'

export interface CreateOAuthStateInput {
  stateHash: string
  provider: SocialProvider
  clientId: string
  organizationId: string
  sanityUserId: string
  expiresAt: Date
}

export interface OAuthState {
  id: string
  stateHash: string
  provider: SocialProvider
  clientId: string
  organizationId: string
  sanityUserId: string
  browserBindingHash: string | null
  launchedAt: string | null
  consumedAt: string | null
  expiresAt: string
}

function toState(row: OAuthStateRow): OAuthState {
  return {
    id: row.id,
    stateHash: row.state_hash,
    provider: row.provider,
    clientId: row.client_id,
    organizationId: row.organization_id,
    sanityUserId: row.sanity_user_id,
    browserBindingHash: row.browser_binding_hash,
    launchedAt: row.launched_at,
    consumedAt: row.consumed_at,
    expiresAt: row.expires_at,
  }
}

/**
 * OAuth state lifecycle: create (from the authenticated app) → launch once (binds the popup's cookie)
 * → consume once (callback). Launch and consume are each a single conditional UPDATE … RETURNING,
 * so concurrent requests cannot both succeed.
 */
export class OAuthStatesRepository {
  readonly #db: ServiceClient

  constructor(db: ServiceClient) {
    this.#db = db
  }

  async create(input: CreateOAuthStateInput): Promise<OAuthState> {
    const {data, error} = await this.#db
      .from('oauth_states')
      .insert({
        state_hash: input.stateHash,
        provider: input.provider,
        client_id: input.clientId,
        organization_id: input.organizationId,
        sanity_user_id: input.sanityUserId,
        expires_at: input.expiresAt.toISOString(),
      })
      .select('*')
      .single()
    if (error) throw new DatabaseError('create oauth state', error)
    return toState(data)
  }

  /** Marks the state launched and stores the browser binding hash, only the first time. */
  async launch(stateHash: string, browserBindingHash: string): Promise<OAuthState | null> {
    const now = new Date().toISOString()
    const {data, error} = await this.#db
      .from('oauth_states')
      .update({launched_at: now, browser_binding_hash: browserBindingHash})
      .eq('state_hash', stateHash)
      .is('launched_at', null)
      .is('consumed_at', null)
      .gt('expires_at', now)
      .select('*')
      .maybeSingle()
    if (error) throw new DatabaseError('launch oauth state', error)
    return data ? toState(data) : null
  }

  /** Atomically consumes a launched, unexpired, unconsumed state. Returns null if that is not possible. */
  async consume(stateHash: string): Promise<OAuthState | null> {
    const now = new Date().toISOString()
    const {data, error} = await this.#db
      .from('oauth_states')
      .update({consumed_at: now})
      .eq('state_hash', stateHash)
      .is('consumed_at', null)
      .not('launched_at', 'is', null)
      .gt('expires_at', now)
      .select('*')
      .maybeSingle()
    if (error) throw new DatabaseError('consume oauth state', error)
    return data ? toState(data) : null
  }

  async deleteExpired(): Promise<number> {
    const {data, error} = await this.#db.rpc('delete_expired_oauth_states')
    if (error) throw new DatabaseError('delete expired oauth states', error)
    return data
  }
}
