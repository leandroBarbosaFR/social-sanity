import 'server-only'
import {createHash} from 'node:crypto'
import {z} from 'zod'
import {getSanityProjectId} from './env'
import {ApiError} from './errors'
import {logger} from './log'

export interface SanityUser {
  id: string
  name: string | null
  email: string | null
}

const SANITY_API = 'https://api.sanity.io/v2025-02-19'
const CACHE_TTL_MS = 60_000
const CACHE_MAX_ENTRIES = 500
const REQUEST_TIMEOUT_MS = 10_000

/** Positive results only, keyed by sha256(token:projectId). The token itself is never stored. */
const cache = new Map<string, {user: SanityUser; expiresAt: number}>()

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullish(),
  email: z.string().nullish(),
})

export function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]+)$/i.exec(header.trim())
  if (!match?.[1]) throw new ApiError(401, 'unauthorized', 'Missing or malformed Authorization header.')
  return match[1]
}

async function sanityGet(path: string, token: string): Promise<Response> {
  try {
    return await fetch(`${SANITY_API}${path}`, {
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    logger.warn('sanity_auth_request_failed', {path, error})
    throw new ApiError(503, 'internal_error', 'Could not reach Sanity to verify the session.')
  }
}

function pruneCache(now: number): void {
  for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key)
  while (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

/**
 * Verifies the caller's Sanity user token (sent by the Sanity app as a bearer token) and that the
 * user is a member of this project. Throws ApiError 401/403 otherwise.
 */
export async function requireSanityUser(request: Request): Promise<SanityUser> {
  const token = bearerToken(request)
  const projectId = getSanityProjectId()
  const cacheKey = createHash('sha256').update(`${token}:${projectId}`).digest('hex')
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > now) return cached.user

  const meResponse = await sanityGet('/users/me', token)
  if (meResponse.status === 401 || meResponse.status === 403) {
    throw new ApiError(401, 'unauthorized', 'Your Sanity session is invalid or expired.')
  }
  if (!meResponse.ok) {
    logger.warn('sanity_users_me_failed', {status: meResponse.status})
    throw new ApiError(503, 'internal_error', 'Could not verify the Sanity session.')
  }
  const parsed = userSchema.safeParse(await meResponse.json().catch(() => null))
  if (!parsed.success) throw new ApiError(401, 'unauthorized', 'Your Sanity session is invalid.')

  const projectResponse = await sanityGet(`/projects/${encodeURIComponent(projectId)}`, token)
  if ([401, 403, 404].includes(projectResponse.status)) {
    throw new ApiError(403, 'forbidden', 'You are not a member of this Sanity project.')
  }
  if (!projectResponse.ok) {
    logger.warn('sanity_project_check_failed', {status: projectResponse.status})
    throw new ApiError(503, 'internal_error', 'Could not verify project membership.')
  }
  // Drain the body so the connection can be reused.
  await projectResponse.arrayBuffer().catch(() => undefined)

  const user: SanityUser = {id: parsed.data.id, name: parsed.data.name ?? null, email: parsed.data.email ?? null}
  pruneCache(now)
  cache.set(cacheKey, {user, expiresAt: now + CACHE_TTL_MS})
  return user
}
