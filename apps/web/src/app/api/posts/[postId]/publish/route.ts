import type {PublishNowResponse} from '@social-studio/shared'
import {z} from 'zod'
import {requireSanityUser} from '@/server/auth'
import {preflight} from '@/server/cors'
import {ApiError, handleApi, json, readJson, toPublishedId} from '@/server/http'
import {publishNow} from '@/server/publishing/publishNow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const bodySchema = z.object({}).strict()

export function OPTIONS(request: Request): Response {
  return preflight(request)
}

/** "Publish now" and retry for approved posts. Returns PublishNowResponse; business failures are 200 with outcome 'failed'. */
export async function POST(request: Request, context: {params: Promise<{postId: string}>}): Promise<Response> {
  return handleApi(request, {cors: true}, async () => {
    const user = await requireSanityUser(request)
    const postId = toPublishedId((await context.params).postId, 'postId')
    const parsed = bodySchema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(400, 'bad_request', 'Invalid request body.')
    const body: PublishNowResponse = await publishNow(postId, {userId: user.id})
    return json(body)
  })
}
