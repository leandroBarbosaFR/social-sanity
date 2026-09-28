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
export function contentAgentFor(userToken: string): {provider: ContentAgentProvider; application: Application} {
  const {organizationId, projectId, dataset} = getContentAgentConfig()
  return {
    provider: createContentAgent({organizationId, token: userToken}),
    // Resolved server-side by workspace name + dataset, like `fromClient` in a Studio. Requires the
    // admin Studio (apps/studio) to be deployed and opened once.
    application: {name: CONTENT_AGENT_WORKSPACE, resource: {id: `${projectId}.${dataset}`, type: 'dataset'}},
  }
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
