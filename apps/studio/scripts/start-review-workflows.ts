/**
 * Starts the post review workflow (Sanity Workflows) for every post that has none yet. The
 * workflow's `intake` stage places each run at the stage matching the post's status. The app does
 * the same lazily when a post is opened; this makes the Workflows tool complete from the start.
 *
 *   pnpm --filter @social-studio/studio start-review-workflows
 */
import {createEngine, refDataset, StartNotAllowedError} from '@sanity/workflow-engine'
import {POST_REVIEW_WORKFLOW, postGdrUri, WORKFLOW_TAG, workflowResource} from '@social-studio/workflows'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-01'}).withConfig({perspective: 'raw', useCdn: false})
const {projectId, dataset} = client.config() as {projectId: string; dataset: string}
const engine = createEngine({client, tag: WORKFLOW_TAG, workflowResource: workflowResource(projectId, dataset)})

const ids = await client.fetch<string[]>(`array::unique(*[_type == "socialPost"]._id)`)
const postIds = [...new Set(ids.map((id) => id.replace(/^drafts\./, '')))]
let started = 0
for (const postId of postIds) {
  const open = await engine.instancesForDocument({document: postGdrUri(projectId, dataset, postId)})
  if (open.some((instance) => instance.definition === POST_REVIEW_WORKFLOW)) continue
  try {
    const {instance} = await engine.startInstance({
      definition: POST_REVIEW_WORKFLOW,
      initialFields: [{type: 'subject', name: 'subject', value: refDataset({projectId, dataset, documentId: postId, type: 'socialPost'})}],
    })
    started += 1
    console.log(`${postId} → ${instance.currentStage}`)
  } catch (error) {
    if (!(error instanceof StartNotAllowedError)) throw error
  }
}
console.log(`Started ${started} review workflow(s).`)
