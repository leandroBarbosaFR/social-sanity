import {z} from 'zod'
import {verifyInternalRequest} from '@/server/hmac'
import {ApiError, handleApi, json, toPublishedId} from '@/server/http'
import {runPublish} from '@/server/publishing/run'
import {takeOverScheduledLock} from '@/server/publishing/writes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const bodySchema = z.object({postId: z.string(), lockId: z.uuid()})

/**
 * Called by the `publish-instagram` Sanity Function for a post the scheduler already claimed.
 * 409 (and no writes) when the lock does not match.
 */
export async function POST(request: Request): Promise<Response> {
  return handleApi(request, {cors: false}, async () => {
    const rawBody = await verifyInternalRequest(request)
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      throw new ApiError(400, 'bad_request', 'Body must be JSON.')
    }
    const parsed = bodySchema.safeParse(payload)
    if (!parsed.success) throw new ApiError(400, 'bad_request', 'postId and lockId are required.')
    const postId = toPublishedId(parsed.data.postId, 'postId')

    const runLockId = await takeOverScheduledLock(postId, parsed.data.lockId)
    if (!runLockId) throw new ApiError(409, 'conflict', 'The post is not locked by this run (or a duplicate delivery already took it).')
    const result = await runPublish(postId, runLockId, 'schedule')
    if (result.outcome === 'lock_lost') {
      throw new ApiError(409, 'conflict', 'The post is not locked by this run.')
    }
    return json(result)
  })
}
