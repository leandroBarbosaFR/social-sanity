import 'server-only'
import {
  isPublishingErrorCode,
  isWorkflowStatus,
  POST_FORMATS,
  type PostForValidation,
  type ResolvedMediaItem,
} from '@social-studio/shared'
import {z} from 'zod'
import {draftId, getSanityClient} from '../sanity'

const publishingStateSchema = z.object({
  lockId: z.string().nullish(),
  startedAt: z.string().nullish(),
  attempt: z.number().nullish(),
  containerId: z.string().nullish(),
  mode: z.enum(['live', 'mock']).nullish(),
})

const publishingErrorSchema = z.object({
  code: z.string().nullish(),
  message: z.string().nullish(),
  retryable: z.boolean().nullish(),
})

const mediaSchema = z.object({
  _key: z.string(),
  _type: z.string(),
  alt: z.string().nullish(),
  url: z.string().nullish(),
  mimeType: z.string().nullish(),
})

export const postSchema = z.object({
  _id: z.string(),
  _rev: z.string(),
  title: z.string().nullish(),
  clientId: z.string().nullish(),
  platforms: z.array(z.string()).nullish(),
  format: z.string().nullish(),
  caption: z.string().nullish(),
  hashtags: z.array(z.string()).nullish(),
  scheduledAt: z.string().nullish(),
  workflowStatus: z.string().nullish(),
  publishingAttempts: z.number().nullish(),
  publishing: publishingStateSchema.nullish(),
  publishingError: publishingErrorSchema.nullish(),
  media: z.array(mediaSchema).nullish(),
  coverUrl: z.string().nullish(),
})

export type PostDoc = z.infer<typeof postSchema>

const POST_PROJECTION = `{
  _id, _rev, title, platforms, format, caption, hashtags, scheduledAt, workflowStatus,
  publishingAttempts, publishing, publishingError,
  "clientId": client._ref,
  "media": media[]{_key, _type, alt, "url": asset->url, "mimeType": asset->mimeType},
  "coverUrl": coverImage.asset->url
}`

/** Fields a person edits. Used to detect unpublished draft changes. */
const CONTENT_PROJECTION = `{title, client, campaign, platforms, format, caption, hashtags, media, coverImage}`

/** Loads the published post (exact ID), resolving media URLs. */
export async function fetchPublishedPost(postId: string): Promise<PostDoc | null> {
  const result: unknown = await getSanityClient().fetch(`*[_type == "socialPost" && _id == $id][0]${POST_PROJECTION}`, {
    id: postId,
  })
  return result ? postSchema.parse(result) : null
}

/** Loads the published post only if the given lock still owns it. */
export async function fetchLockedPost(postId: string, lockId: string): Promise<PostDoc | null> {
  const result: unknown = await getSanityClient().fetch(
    `*[_type == "socialPost" && _id == $id && publishing.lockId == $lockId][0]${POST_PROJECTION}`,
    {id: postId, lockId},
  )
  return result ? postSchema.parse(result) : null
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/** 'none' (no draft), 'same' (draft content equals published), 'different', or 'draft_only'. */
export async function compareDraft(postId: string): Promise<'none' | 'same' | 'different' | 'draft_only'> {
  const result = (await getSanityClient().fetch(
    `{"published": *[_id == $id][0]${CONTENT_PROJECTION}, "draft": *[_id == $draftId][0]${CONTENT_PROJECTION}}`,
    {id: postId, draftId: draftId(postId)},
  )) as {published: unknown; draft: unknown} | null
  if (!result?.draft) return 'none'
  if (!result.published) return 'draft_only'
  return stableStringify(result.published) === stableStringify(result.draft) ? 'same' : 'different'
}

export function resolveMedia(post: PostDoc): ResolvedMediaItem[] {
  return (post.media ?? []).map((item) => ({
    _key: item._key,
    kind: item._type === 'socialVideo' ? 'video' : 'image',
    url: item.url ?? null,
    mimeType: item.mimeType ?? null,
    alt: item.alt ?? null,
  }))
}

export function toValidationInput(post: PostDoc): PostForValidation {
  const format = POST_FORMATS.find((value) => value === post.format) ?? null
  return {
    title: post.title,
    clientId: post.clientId,
    platforms: (post.platforms ?? []).filter((p): p is 'instagram' => p === 'instagram'),
    format,
    caption: post.caption,
    hashtags: post.hashtags,
    media: resolveMedia(post),
    coverImageUrl: post.coverUrl,
    scheduledAt: post.scheduledAt,
    workflowStatus: isWorkflowStatus(post.workflowStatus) ? post.workflowStatus : null,
  }
}

/** A previous failure left a container worth resuming (retryable error + known container). */
export function resumableContainerId(post: Pick<PostDoc, 'publishing' | 'publishingError'>): string | null {
  const error = post.publishingError
  const containerId = post.publishing?.containerId
  if (!containerId || !error || error.retryable !== true) return null
  if (error.code && isPublishingErrorCode(error.code) && error.code === 'validation_failed') return null
  return containerId
}
