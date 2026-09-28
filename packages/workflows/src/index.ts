import {isWorkflowStatus, type WorkflowStatus} from '@social-studio/shared'

export {postReview} from './postReview'

/** Deployment tag every surface (app, Studio, backend, functions, CLI) reads and writes under. */
export const WORKFLOW_TAG = 'prod'

export const POST_REVIEW_WORKFLOW = 'social-post-review'

/** Engine documents live beside the content in the same dataset. */
export function workflowResource(projectId: string, dataset: string): {type: 'dataset'; id: string} {
  return {type: 'dataset', id: `${projectId}.${dataset}`}
}

/** Global document reference URI for a post (always the published ID; drafts are read via perspective). */
export function postGdrUri(projectId: string, dataset: string, postId: string): `dataset:${string}` {
  return `dataset:${projectId}:${dataset}:${postId.replace(/^drafts\./, '')}`
}

/** The document ID at the end of a dataset GDR URI (`dataset:<project>:<dataset>:<id>`). */
export function documentIdFromGdrUri(uri: string): string | null {
  const parts = uri.split(':')
  return parts[0] === 'dataset' && parts.length === 4 && parts[3] ? parts[3] : null
}

const REVIEW_STAGES: readonly WorkflowStatus[] = ['idea', 'draft', 'internalReview', 'clientReview']

/**
 * The `workflowStatus` a post should carry for a workflow stage, or `null` to leave it alone.
 * Review stages map one-to-one. `approved` only overwrites a pre-approval status, because
 * `scheduled`, `publishing` and `failed` belong to the publishing service. `intake` and
 * `published` never write.
 */
export function statusForStage(stage: string, current: WorkflowStatus | null | undefined): WorkflowStatus | null {
  if (REVIEW_STAGES.includes(stage as WorkflowStatus)) return stage as WorkflowStatus
  if (stage === 'approved') {
    return current === undefined || current === null || REVIEW_STAGES.includes(current) ? 'approved' : null
  }
  return null
}

export function isReviewStage(stage: string): boolean {
  return isWorkflowStatus(stage) && (REVIEW_STAGES.includes(stage) || stage === 'approved')
}
