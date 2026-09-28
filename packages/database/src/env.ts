/**
 * Lazy configuration readers. Nothing is read at import time, so builds work without env vars.
 */

export type DatabaseConfigErrorCode = 'supabase_not_configured' | 'encryption_not_configured'

export class DatabaseConfigError extends Error {
  readonly code: DatabaseConfigErrorCode

  constructor(code: DatabaseConfigErrorCode, message: string) {
    super(message)
    this.name = 'DatabaseConfigError'
    this.code = code
  }
}

export interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

function read(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim()
  return value ? value : undefined
}

/** Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY. */
export function readSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig {
  const url = read(env, 'NEXT_PUBLIC_SUPABASE_URL') ?? read(env, 'SUPABASE_URL')
  const serviceRoleKey = read(env, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new DatabaseConfigError(
      'supabase_not_configured',
      'Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
    )
  }
  try {
    new URL(url)
  } catch {
    throw new DatabaseConfigError('supabase_not_configured', 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL.')
  }
  return {url, serviceRoleKey}
}

/** Reads SOCIAL_TOKEN_ENCRYPTION_KEY (base64, 32 bytes). Validation happens in crypto.parseEncryptionKey. */
export function readEncryptionKeySource(env: NodeJS.ProcessEnv = process.env): string {
  const key = read(env, 'SOCIAL_TOKEN_ENCRYPTION_KEY')
  if (!key) {
    throw new DatabaseConfigError('encryption_not_configured', 'SOCIAL_TOKEN_ENCRYPTION_KEY is not set.')
  }
  return key
}
