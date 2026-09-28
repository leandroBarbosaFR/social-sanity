export const WORKFLOW_STATUSES = [
  'idea',
  'draft',
  'internalReview',
  'clientReview',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'failed',
] as const

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  internalReview: 'Internal review',
  clientReview: 'Client review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
}

/** Visual tone per status, matching Sanity UI card/badge tones. */
export type StatusTone = 'default' | 'primary' | 'positive' | 'caution' | 'critical' | 'suggest'

export const WORKFLOW_STATUS_TONES: Record<WorkflowStatus, StatusTone> = {
  idea: 'default',
  draft: 'default',
  internalReview: 'caution',
  clientReview: 'caution',
  approved: 'suggest',
  scheduled: 'primary',
  publishing: 'primary',
  published: 'positive',
  failed: 'critical',
}

/**
 * Transitions a person may trigger from the app. `publishing`, `published` and `failed` are
 * entered only by the publishing service, never set by hand.
 */
export const USER_TRANSITIONS: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  idea: ['draft'],
  draft: ['idea', 'internalReview'],
  internalReview: ['draft', 'clientReview', 'approved'],
  clientReview: ['draft', 'internalReview', 'approved'],
  approved: ['draft', 'scheduled'],
  scheduled: ['approved'],
  publishing: [],
  published: [],
  failed: ['draft', 'approved', 'scheduled'],
}

/** Transitions only the publishing service performs. */
export const SYSTEM_TRANSITIONS: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  idea: [],
  draft: [],
  internalReview: [],
  clientReview: [],
  approved: ['publishing'],
  scheduled: ['publishing'],
  publishing: ['published', 'failed'],
  published: [],
  failed: ['publishing'],
}

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return USER_TRANSITIONS[from].includes(to)
}

/** Publishing is only possible after human approval: from Approved, Scheduled, or a Failed run. */
export const PUBLISHABLE_STATUSES: readonly WorkflowStatus[] = ['approved', 'scheduled', 'failed']

export type PublishEligibility =
  | {allowed: true}
  | {allowed: false; reason: 'not_approved' | 'in_progress' | 'already_published'; message: string}

/**
 * Whether a post in `status` may be handed to the publishing service. Approval is mandatory:
 * content that has not passed the review workflow is never published, whoever asks.
 */
export function publishEligibility(status: string | null | undefined): PublishEligibility {
  if (status === 'publishing') return {allowed: false, reason: 'in_progress', message: 'A publishing run is already in progress.'}
  if (status === 'published') return {allowed: false, reason: 'already_published', message: 'This post was already published.'}
  if (status && (PUBLISHABLE_STATUSES as readonly string[]).includes(status)) return {allowed: true}
  return {allowed: false, reason: 'not_approved', message: 'Only approved posts can be published. Take it through review first.'}
}

/** The editorial half of a status: where the post stands in the review workflow. */
export const EDITORIAL_STAGES = ['idea', 'draft', 'internalReview', 'clientReview', 'approved'] as const
export type EditorialStage = (typeof EDITORIAL_STAGES)[number]

/** The publishing half of a status: what the publishing service is doing with it. */
export const PUBLISHING_PHASES = ['unscheduled', 'scheduled', 'publishing', 'published', 'failed'] as const
export type PublishingPhase = (typeof PUBLISHING_PHASES)[number]

export const PUBLISHING_PHASE_LABELS: Record<PublishingPhase, string> = {
  unscheduled: 'Not scheduled',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
}

/**
 * `workflowStatus` is one field on purpose (the scheduler, locks and filters read one value), but it
 * describes two things. Scheduling and publishing are only reachable after approval, so every
 * publishing status is editorially "approved".
 */
export function editorialStage(status: WorkflowStatus | null | undefined): EditorialStage {
  if (!status) return 'idea'
  return (EDITORIAL_STAGES as readonly string[]).includes(status) ? (status as EditorialStage) : 'approved'
}

export function publishingPhase(status: WorkflowStatus | null | undefined): PublishingPhase {
  switch (status) {
    case 'scheduled':
    case 'publishing':
    case 'published':
    case 'failed':
      return status
    default:
      return 'unscheduled'
  }
}

/** Content is locked for editing while the publishing service owns it or after it went live. */
export function isLockedStatus(status: WorkflowStatus | undefined): boolean {
  return status === 'publishing' || status === 'published'
}

export function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return typeof value === 'string' && (WORKFLOW_STATUSES as readonly string[]).includes(value)
}

/** Status groups used by list filters. */
export const STATUS_FILTERS = [
  {id: 'all', label: 'All', statuses: null},
  {id: 'idea', label: 'Idea', statuses: ['idea']},
  {id: 'draft', label: 'Draft', statuses: ['draft']},
  {id: 'review', label: 'Review', statuses: ['internalReview', 'clientReview']},
  {id: 'approved', label: 'Approved', statuses: ['approved']},
  {id: 'scheduled', label: 'Scheduled', statuses: ['scheduled', 'publishing']},
  {id: 'published', label: 'Published', statuses: ['published']},
  {id: 'failed', label: 'Failed', statuses: ['failed']},
] as const satisfies readonly {id: string; label: string; statuses: readonly WorkflowStatus[] | null}[]

export type StatusFilterId = (typeof STATUS_FILTERS)[number]['id']
