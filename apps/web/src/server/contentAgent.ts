import 'server-only'
import {CONTENT_AGENT_WORKSPACE} from '@social-studio/shared'
import {
  classifyAgentError,
  createContentAgent,
  getAgentErrorMessage,
  type Application,
  type Config,
  type ContentAgentProvider,
} from 'content-agent'
import {getContentAgentConfig} from './env'
import {ApiError} from './errors'
import {logger} from './log'

/**
 * Sanity Content Agent, called as the signed-in user: the app's bearer token (already verified by
 * requireSanityUser) is forwarded, so the agent sees and changes only what that person may, its
 * writes are attributed to them, and no shared editor token is needed. The browser never talks to
 * the agent directly.
 */
export async function contentAgentFor(userToken: string): Promise<{provider: ContentAgentProvider; application: Application}> {
  const {organizationId, projectId, dataset} = getContentAgentConfig()
  const provider = createContentAgent({organizationId, token: userToken})
  return {provider, application: await resolveApplication(provider, projectId, dataset)}
}

/**
 * The deployed admin Studio workspace Content Agent works in. Addressing it by name + resource is
 * not enough (the agent then asks "which studio?"); it needs the application key, which is stable
 * per deployment, so it is cached per process.
 */
const applicationCache = new Map<string, {application: Application; expiresAt: number}>()
const APPLICATION_TTL_MS = 10 * 60_000

async function resolveApplication(provider: ContentAgentProvider, projectId: string, dataset: string): Promise<Application> {
  const cacheKey = `${projectId}.${dataset}`
  const cached = applicationCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.application
  const resolved = await provider.resolveApplication({config: () => ({projectId, dataset})}, CONTENT_AGENT_WORKSPACE)
  const application: Application = resolved.key ? {key: resolved.key} : resolved
  applicationCache.set(cacheKey, {application, expiresAt: Date.now() + APPLICATION_TTL_MS})
  return application
}

/** Types the agent may read: the content model, not system documents. */
export const READABLE_TYPES = '_type in ["socialPost", "campaign", "client", "brandGuidelines"]'

/** Read-only config for one-shot generation. Drafts first, so unsaved edits count. */
export const readOnlyConfig = (instruction: string): Config => ({
  instruction,
  capabilities: {read: true, write: false, features: {webSearch: false}},
  filter: {read: READABLE_TYPES},
  perspectives: {read: ['drafts']},
})

/**
 * Assistant config: reads the content model and may draft posts, but never touches a post the
 * publishing service owns. Content Agent writes drafts only; people save them.
 */
export const assistantConfig = (context: Record<string, string>): Config => ({
  instruction:
    'You are the assistant in Social Studio, an agency tool for planning and publishing Instagram posts. ' +
    'Answer concisely. When you create or edit posts, leave workflowStatus unchanged (new posts use "idea") ' +
    'and never set scheduling or publishing fields; people review and save your drafts.',
  userMessageContext: context,
  capabilities: {read: true, write: {preset: 'minimal'}, features: {webSearch: false}},
  filter: {
    read: READABLE_TYPES,
    write: '_type == "socialPost" && !(workflowStatus in ["scheduled", "publishing", "published"])',
  },
})

/** Maps a Content Agent failure to a typed API error the app can show. */
export function toContentAgentError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const kind = classifyAgentError(error)
  logger.warn('content_agent_failed', {kind: kind.type, error})
  switch (kind.type) {
    case 'no_applications':
    case 'application_not_found':
      return new ApiError(
        503,
        'ai_not_configured',
        'Content Agent cannot find the Social Studio admin Studio. Deploy apps/studio and open it once.',
      )
    case 'usage_limit_exceeded':
      return new ApiError(503, 'ai_unavailable', 'Your organization has used its AI credits.')
    default:
      return new ApiError(503, 'ai_unavailable', getAgentErrorMessage(error))
  }
}
