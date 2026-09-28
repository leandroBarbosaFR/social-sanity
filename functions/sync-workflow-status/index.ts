import {createClient} from '@sanity/client'
import {documentEventHandler} from '@sanity/functions'

/**
 * Document function on `sanity.workflow.instance` stage changes (post review workflow). Mirrors the
 * instance's stage onto the post's `workflowStatus`, whichever surface moved it: the Sanity app
 * already writes the status itself, but the admin Studio's Workflows plugin, the workflows CLI and
 * the Workflows MCP server do not. Writes are guarded by `ifRevisionId`, so a concurrent publishing
 * claim is never overwritten.
 */

const API_VERSION = '2026-09-01'

interface InstanceEvent {
  _id: string
  currentStage?: string | null
  subject?: string | null
}

interface PostState {
  _id: string
  _rev: string
  workflowStatus?: string | null
}

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({fn: 'sync-workflow-status', event, ...fields}))
}

const REVIEW_STAGES = ['idea', 'draft', 'internalReview', 'clientReview']

/** Same mapping as `statusForStage` in packages/workflows (functions deploy self-contained). */
function statusForStage(stage: string, current: string | null | undefined): string | null {
  if (REVIEW_STAGES.includes(stage)) return stage
  if (stage === 'approved') return !current || REVIEW_STAGES.includes(current) ? 'approved' : null
  return null
}

/** `dataset:<project>:<dataset>:<id>` → `<id>` */
function documentIdFromGdrUri(uri: string): string | null {
  const parts = uri.split(':')
  return parts[0] === 'dataset' && parts.length === 4 && parts[3] ? parts[3] : null
}

export const handler = documentEventHandler<InstanceEvent>(async ({context, event}) => {
  const {currentStage, subject} = event.data
  const postId = subject ? documentIdFromGdrUri(subject) : null
  if (!currentStage || !postId) {
    log('skipped', {instanceId: event.data._id, reason: 'no stage or subject'})
    return
  }

  const client = createClient({...context.clientOptions, apiVersion: API_VERSION, perspective: 'raw', useCdn: false})
  const docs = await client.fetch<PostState[]>(
    `*[_id in [$id, "drafts." + $id] && _type == "socialPost"]{_id, _rev, workflowStatus}`,
    {id: postId},
  )
  const tx = client.transaction()
  let changes = 0
  for (const doc of docs) {
    const target = statusForStage(currentStage, doc.workflowStatus)
    if (!target || target === doc.workflowStatus) continue
    tx.patch(client.patch(doc._id).ifRevisionId(doc._rev).set({workflowStatus: target}))
    changes += 1
  }
  if (changes === 0) {
    log('in_sync', {postId, stage: currentStage})
    return
  }
  await tx.commit({visibility: 'async'})
  log('synced', {postId, stage: currentStage, documents: changes})
})
