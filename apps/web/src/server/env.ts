import 'server-only'
import {DatabaseConfigError, parseEncryptionKey, type EncryptionKey} from '@social-studio/database'
import type {InstagramAppConfig} from '@social-studio/instagram'
import {z} from 'zod'
import {parseAllowedOrigins} from './corsPolicy'
import {ApiError} from './errors'

/**
 * All configuration is read lazily at request time, so `next build` works with no env vars.
 * Variables are read with a computed key (`process.env[name]`) on purpose: Next.js inlines static
 * `process.env.NEXT_PUBLIC_*` references at build time, which would freeze build-time values.
 */
function readVar(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

const nonEmpty = z.string().min(1)
const httpUrl = z.url({protocol: /^https?$/})

const sanitySchema = z.object({
  projectId: z.string().regex(/^[a-z0-9-]+$/, 'must be a Sanity project ID'),
  dataset: z.string().regex(/^[a-z0-9_-]+$/, 'must be a dataset name'),
  token: nonEmpty,
})

export interface SanityConfig {
  projectId: string
  dataset: string
  token: string
  apiVersion: string
}

export const SANITY_API_VERSION = '2026-09-01'

export function getSanityProjectId(): string {
  const parsed = sanitySchema.shape.projectId.safeParse(readVar('NEXT_PUBLIC_SANITY_PROJECT_ID'))
  if (!parsed.success) throw new ApiError(503, 'sanity_not_configured', 'Sanity project is not configured on the server.')
  return parsed.data
}

export function getSanityConfig(): SanityConfig {
  const parsed = sanitySchema.safeParse({
    projectId: readVar('NEXT_PUBLIC_SANITY_PROJECT_ID'),
    dataset: readVar('NEXT_PUBLIC_SANITY_DATASET'),
    token: readVar('SANITY_API_TOKEN'),
  })
  if (!parsed.success) {
    throw new ApiError(503, 'sanity_not_configured', 'Sanity is not configured on the server.')
  }
  return {...parsed.data, apiVersion: SANITY_API_VERSION}
}

export interface ContentAgentConfig {
  organizationId: string
  projectId: string
  dataset: string
}

/** Content Agent runs as the signed-in user (their token), so it needs no secret of its own. */
export function getContentAgentConfig(): ContentAgentConfig {
  const parsed = z
    .object({
      organizationId: z.string().regex(/^[A-Za-z0-9]+$/, 'must be a Sanity organization ID'),
      projectId: sanitySchema.shape.projectId,
      dataset: sanitySchema.shape.dataset,
    })
    .safeParse({
      organizationId: readVar('SANITY_ORGANIZATION_ID'),
      projectId: readVar('NEXT_PUBLIC_SANITY_PROJECT_ID'),
      dataset: readVar('NEXT_PUBLIC_SANITY_DATASET'),
    })
  if (!parsed.success) {
    throw new ApiError(503, 'ai_not_configured', 'Content Agent is not configured (SANITY_ORGANIZATION_ID).')
  }
  return parsed.data
}

const supabaseSchema = z.object({url: httpUrl, serviceRoleKey: nonEmpty})

export function getSupabaseConfig(): {url: string; serviceRoleKey: string} {
  const parsed = supabaseSchema.safeParse({
    url: readVar('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: readVar('SUPABASE_SERVICE_ROLE_KEY'),
  })
  if (!parsed.success) {
    throw new ApiError(503, 'supabase_not_configured', 'Supabase is not configured on the server.')
  }
  return parsed.data
}

let cachedKey: {source: string; key: EncryptionKey} | null = null

export function getEncryptionKey(): EncryptionKey {
  const source = readVar('SOCIAL_TOKEN_ENCRYPTION_KEY')
  if (!source) throw new ApiError(503, 'encryption_not_configured', 'Token encryption key is not configured.')
  if (cachedKey?.source === source) return cachedKey.key
  try {
    const key = parseEncryptionKey(source)
    cachedKey = {source, key}
    return key
  } catch (error) {
    if (error instanceof DatabaseConfigError) throw new ApiError(503, 'encryption_not_configured', error.message)
    throw error
  }
}

const metaSchema = z.object({appId: z.string().regex(/^\d+$/), appSecret: nonEmpty, redirectUri: httpUrl})

function readMetaConfig(): InstagramAppConfig | null {
  const parsed = metaSchema.safeParse({
    appId: readVar('META_APP_ID'),
    appSecret: readVar('META_APP_SECRET'),
    redirectUri: readVar('META_REDIRECT_URI'),
  })
  return parsed.success ? parsed.data : null
}

export type InstagramRuntime =
  | {mode: 'live'; config: InstagramAppConfig}
  | {mode: 'mock'; redirectUri: string}
  | {mode: 'unconfigured'; message: string}

/** INSTAGRAM_API_MODE=live|mock. Mock is refused when NODE_ENV === 'production'. */
export function getInstagramRuntime(): InstagramRuntime {
  const requested = readVar('INSTAGRAM_API_MODE') ?? 'live'
  if (requested === 'mock') {
    if (process.env.NODE_ENV === 'production') {
      return {mode: 'unconfigured', message: 'INSTAGRAM_API_MODE=mock is not allowed in production.'}
    }
    const base = readAppBaseUrl()
    const redirectUri = readVar('META_REDIRECT_URI') ?? (base ? `${base}/api/auth/instagram/callback` : null)
    if (!redirectUri) return {mode: 'unconfigured', message: 'Set APP_BASE_URL to use the Instagram mock.'}
    return {mode: 'mock', redirectUri}
  }
  if (requested !== 'live') {
    return {mode: 'unconfigured', message: 'INSTAGRAM_API_MODE must be "live" or "mock".'}
  }
  const config = readMetaConfig()
  if (!config) return {mode: 'unconfigured', message: 'Instagram API credentials not configured.'}
  return {mode: 'live', config}
}

export function isMetaConfigured(): boolean {
  return readMetaConfig() !== null
}

function readAppBaseUrl(): string | null {
  const parsed = httpUrl.safeParse(readVar('APP_BASE_URL'))
  return parsed.success ? parsed.data.replace(/\/+$/, '') : null
}

/** This app's public origin, e.g. https://social-api.example.com. */
export function getAppBaseUrl(): string {
  const base = readAppBaseUrl()
  if (!base) throw new ApiError(503, 'internal_error', 'APP_BASE_URL is not configured on the server.')
  return base
}

/** Origins allowed to call the API from a browser (the Sanity app); comma-separated, see corsPolicy. */
export function getAllowedOrigins(): ReadonlySet<string> {
  return parseAllowedOrigins(readVar('ALLOWED_APP_ORIGINS'))
}

export function getInternalApiSecret(): string {
  const secret = readVar('INTERNAL_API_SECRET')
  if (!secret || secret.length < 32) {
    throw new ApiError(503, 'internal_error', 'INTERNAL_API_SECRET is not configured (min. 32 characters).')
  }
  return secret
}

/** Booleans only: used by GET /api/health. */
export function getIntegrationStatus(): {
  ok: true
  sanity: boolean
  supabase: boolean
  meta: boolean
  encryption: boolean
  contentAgent: boolean
  instagramMode: 'live' | 'mock' | 'unconfigured'
} {
  const ok = (fn: () => unknown) => {
    try {
      fn()
      return true
    } catch {
      return false
    }
  }
  return {
    ok: true,
    sanity: ok(getSanityConfig),
    supabase: ok(getSupabaseConfig),
    meta: isMetaConfigured(),
    encryption: ok(getEncryptionKey),
    contentAgent: ok(getContentAgentConfig),
    instagramMode: getInstagramRuntime().mode,
  }
}
