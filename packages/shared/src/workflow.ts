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

/** Statuses from which "Publish now" is allowed without an extra confirmation. */
export const DIRECT_PUBLISH_STATUSES: readonly WorkflowStatus[] = ['approved', 'scheduled', 'failed']

/** Statuses from which publishing is possible at all (with explicit confirmation). */
export const CONFIRMABLE_PUBLISH_STATUSES: readonly WorkflowStatus[] = [
  'draft',
  'internalReview',
  'clientReview',
]

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
  {id: 'draft', label: 'Draft', statuses: ['idea', 'draft']},
  {id: 'review', label: 'Review', statuses: ['internalReview', 'clientReview']},
  {id: 'approved', label: 'Approved', statuses: ['approved']},
  {id: 'scheduled', label: 'Scheduled', statuses: ['scheduled', 'publishing']},
  {id: 'published', label: 'Published', statuses: ['published']},
  {id: 'failed', label: 'Failed', statuses: ['failed']},
] as const satisfies readonly {id: string; label: string; statuses: readonly WorkflowStatus[] | null}[]

export type StatusFilterId = (typeof STATUS_FILTERS)[number]['id']
