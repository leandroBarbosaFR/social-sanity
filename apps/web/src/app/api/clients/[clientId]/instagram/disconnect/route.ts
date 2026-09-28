import type {DisconnectInstagramResponse} from '@social-studio/shared'
import {requireSanityUser} from '@/server/auth'
import {requireClient, unsetInstagram} from '@/server/clients'
import {preflight} from '@/server/cors'
import {getSocialAccountsWithoutKey} from '@/server/database'
import {handleApi, json, toPublishedId} from '@/server/http'
import {logger} from '@/server/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function OPTIONS(request: Request): Response {
  return preflight(request)
}

/** Deletes the stored token and removes the connection summary from the client document. */
export async function POST(request: Request, context: {params: Promise<{clientId: string}>}): Promise<Response> {
  return handleApi(request, {cors: true}, async () => {
    const user = await requireSanityUser(request)
    const clientId = toPublishedId((await context.params).clientId, 'clientId')
    await requireClient(clientId)
    const deleted = await getSocialAccountsWithoutKey().disconnect(clientId, 'instagram')
    await unsetInstagram(clientId)
    logger.info('instagram_disconnected', {clientId, userId: user.id, socialAccountId: deleted?.id ?? null})
    const body: DisconnectInstagramResponse = {disconnected: true}
    return json(body)
  })
}
