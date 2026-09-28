import 'server-only'
import {createHash} from 'node:crypto'
import {createClient, type SanityClient} from '@sanity/client'
import {getSanityConfig} from './env'

/** Cache key that changes with the credentials without keeping them in plain form. */
function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

let cached: {key: string; client: SanityClient} | null = null

/**
 * Server-side Sanity client with the write token. Uses the `raw` perspective so every query
 * addresses exact IDs (`<id>` = published, `drafts.<id>` = draft).
 */
export function getSanityClient(): SanityClient {
  const config = getSanityConfig()
  const key = fingerprint(`${config.projectId}:${config.dataset}:${config.token}`)
  if (cached?.key === key) return cached.client
  const client = createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    token: config.token,
    apiVersion: config.apiVersion,
    useCdn: false,
    perspective: 'raw',
    ignoreBrowserTokenWarning: true,
  })
  cached = {key, client}
  return client
}

export function draftId(id: string): string {
  return `drafts.${id}`
}

/** Sanity returns 409 when an `ifRevisionID` precondition fails. */
export function isRevisionConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as {statusCode: unknown}).statusCode === 409
  )
}
