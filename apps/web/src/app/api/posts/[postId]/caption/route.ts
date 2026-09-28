import {randomUUID} from 'node:crypto'
import {INSTAGRAM_LIMITS, normalizeHashtag, type GenerateCaptionResponse} from '@social-studio/shared'
import {generateText} from 'ai'
import {z} from 'zod'
import {bearerToken, requireSanityUser} from '@/server/auth'
import {contentAgentFor, readOnlyConfig, toContentAgentError} from '@/server/contentAgent'
import {preflight} from '@/server/cors'
import {ApiError, handleApi, json, readJson, toPublishedId} from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const bodySchema = z.object({brief: z.string().trim().max(500).optional()})

const suggestionSchema = z.object({
  caption: z.string().trim().min(1).max(INSTAGRAM_LIMITS.captionMaxLength),
  hashtags: z.array(z.string()).max(INSTAGRAM_LIMITS.hashtagsMax),
})

const INSTRUCTION =
  'You write Instagram captions for a social media agency. Use the client brand guidelines ' +
  '(brandGuidelines documents referencing the client) for voice, audience and words to avoid. ' +
  'Reply with only a JSON object {"caption": string, "hashtags": string[]} and no other text. ' +
  'Hashtags are single words without "#", 5 to 15 of them. Keep the caption under 1800 characters ' +
  'and do not repeat the hashtags inside it.'

/** Pulls the JSON object out of the reply, tolerating a Markdown code fence around it. */
function parseSuggestion(text: string): GenerateCaptionResponse | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  const parsed = suggestionSchema.safeParse(raw)
  if (!parsed.success) return null
  const hashtags = [...new Set(parsed.data.hashtags.map(normalizeHashtag).filter((tag): tag is string => tag !== null))]
  return {caption: parsed.data.caption, hashtags}
}

export function OPTIONS(request: Request): Response {
  return preflight(request)
}

/** Drafts a caption + hashtags with Content Agent. Read-only; the app applies it to the editor. */
export async function POST(request: Request, context: {params: Promise<{postId: string}>}): Promise<Response> {
  return handleApi(request, {cors: true}, async () => {
    await requireSanityUser(request)
    const postId = toPublishedId((await context.params).postId, 'postId')
    const parsed = bodySchema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(400, 'bad_request', 'Invalid request body.')

    const brief = parsed.data.brief ? `\nDirection from the team: ${parsed.data.brief}` : ''
    let text: string
    try {
      const {provider, application} = await contentAgentFor(bearerToken(request))
      // A throwaway thread: content-agent 1.3.1's one-shot prompt() cannot parse the API's streamed
      // reply, while the thread model does. Nothing is shared between generations.
      const result = await generateText({
        model: provider.agent(`caption-${randomUUID()}`, {application, config: readOnlyConfig(INSTRUCTION), format: 'markdown'}),
        prompt:
          `Write the caption and hashtags for the socialPost with _id "${postId}" (read its draft if one exists). ` +
          `Use its title, format, existing caption notes, its campaign (objective, audience, key messages) and its ` +
          `client's brand guidelines (voice, audience, content pillars, words to use and avoid, CTA preferences, notes). ` +
          `Write in the client's primaryLanguage.${brief}`,
      })
      text = result.text
    } catch (error) {
      throw toContentAgentError(error)
    }

    const suggestion = parseSuggestion(text)
    if (!suggestion) throw new ApiError(503, 'ai_unavailable', 'Content Agent returned an unexpected answer. Try again.')
    return json(suggestion)
  })
}
