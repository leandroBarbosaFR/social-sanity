import 'server-only'
import {createHash} from 'node:crypto'
import {
  createServiceClient,
  OAuthStatesRepository,
  SocialAccountsRepository,
  type ServiceClient,
} from '@social-studio/database'
import {getEncryptionKey, getSupabaseConfig} from './env'

/** Cache key that changes with the credentials without keeping them in plain form. */
function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

let cached: {key: string; client: ServiceClient} | null = null

function getServiceClient(): ServiceClient {
  const config = getSupabaseConfig()
  const key = fingerprint(`${config.url}:${config.serviceRoleKey}`)
  if (cached?.key === key) return cached.client
  const client = createServiceClient(config)
  cached = {key, client}
  return client
}

/** Repository with token access (requires Supabase and the encryption key). */
export function getSocialAccounts(): SocialAccountsRepository {
  const client = getServiceClient()
  return new SocialAccountsRepository(client, getEncryptionKey())
}

/** Repository for metadata-only operations (e.g. disconnect), which do not need the key. */
export function getSocialAccountsWithoutKey(): SocialAccountsRepository {
  return new SocialAccountsRepository(getServiceClient(), null)
}

export function getOAuthStates(): OAuthStatesRepository {
  return new OAuthStatesRepository(getServiceClient())
}
