import {createHash} from 'node:crypto'
import {streamText} from 'ai'
import {getAgentErrorMessage} from 'content-agent'
import {z} from 'zod'
import {bearerToken, requireSanityUser} from '@/server/auth'
import {assistantConfig, contentAgentFor, toContentAgentError} from '@/server/contentAgent'
import {preflight} from '@/server/cors'
import {ApiError, handleApi, readJson, toPublishedId} from '@/server/http'
import {logger} from '@/server/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const bodySchema = z.object({
  threadId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  message: z.string().trim().min(1).max(8000),
  postId: z.string().optional(),
})

/** Content Agent keeps thread history server-side; scope the client's ID to the user so threads never cross accounts. */
function scopedThreadId(userId: string, threadId: string): string {
  return `social-studio-${createHash('sha256').update(`${userId}:${threadId}`).digest('hex').slice(0, 40)}`
}

export function OPTIONS(request: Request): Response {
  return preflight(request)
}

/** One assistant turn, streamed to the app as an AI SDK UI message stream. */
export async function POST(request: Request): Promise<Response> {
  return handleApi(request, {cors: true}, async () => {
    const user = await requireSanityUser(request)
    const parsed = bodySchema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(400, 'bad_request', 'Invalid request body.')
    const {threadId, message, postId} = parsed.data

    const context: Record<string, string> = {'current-user': user.name ?? user.id}
    if (postId) context['open-post-id'] = toPublishedId(postId, 'postId')

    try {
      const {provider, application} = contentAgentFor(bearerToken(request))
      const result = streamText({
        model: provider.agent(scopedThreadId(user.id, threadId), {application, config: assistantConfig(context)}),
        prompt: message,
      })
      return result.toUIMessageStreamResponse({
        onError: (error) => {
          logger.warn('assistant_stream_failed', {error})
          return getAgentErrorMessage(error)
        },
      })
    } catch (error) {
      throw toContentAgentError(error)
    }
  })
}
