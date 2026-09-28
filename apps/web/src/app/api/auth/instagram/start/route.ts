import type {StartInstagramConnectResponse} from '@social-studio/shared'
import {z} from 'zod'
import {requireSanityUser} from '@/server/auth'
import {requireClient} from '@/server/clients'
import {preflight} from '@/server/cors'
import {getOAuthStates} from '@/server/database'
import {getAppBaseUrl, getEncryptionKey} from '@/server/env'
import {ApiError, handleApi, json, readJson, toPublishedId} from '@/server/http'
import {getInstagramService} from '@/server/instagram'
import {logger} from '@/server/log'
import {randomToken, sha256Hex, STATE_TTL_SECONDS} from '@/server/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({clientId: z.string()})

export function OPTIONS(request: Request): Response {
  return preflight(request)
}

/** Creates a single-use OAuth state for connecting Instagram to a client. */
export async function POST(request: Request): Promise<Response> {
  return handleApi(request, {cors: true}, async () => {
    const user = await requireSanityUser(request)
    const parsed = bodySchema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(400, 'bad_request', 'clientId is required.')
    const clientId = toPublishedId(parsed.data.clientId, 'clientId')

    // Check every dependency of the flow up front so the popup never opens into a dead end.
    getInstagramService()
    getEncryptionKey()
    const baseUrl = getAppBaseUrl()
    const client = await requireClient(clientId)

    const state = randomToken()
    const expiresAt = new Date(Date.now() + STATE_TTL_SECONDS * 1000)
    await getOAuthStates().create({
      stateHash: sha256Hex(state),
      provider: 'instagram',
      clientId,
      organizationId: client.organizationId,
      sanityUserId: user.id,
      expiresAt,
    })
    logger.info('instagram_connect_started', {clientId, userId: user.id})

    const body: StartInstagramConnectResponse = {
      authorizeUrl: `${baseUrl}/api/auth/instagram/authorize?state=${encodeURIComponent(state)}`,
      expiresAt: expiresAt.toISOString(),
    }
    return json(body)
  })
}
