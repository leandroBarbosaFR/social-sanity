import {
  defineBlueprint,
  defineDocumentFunction,
  definePubSubFunction,
  defineRobotToken,
  defineScheduledFunction,
} from '@sanity/blueprints'

/**
 * Social Studio publishing infrastructure (org-scoped: scheduled functions are organization resources).
 *
 * Non-secret values come from the shell environment at deploy time:
 *   SANITY_ORGANIZATION_ID, SANITY_PROJECT_ID, SANITY_DATASET
 * Secrets are NOT defined here. Set them per function after the first deploy:
 *   npx sanity@latest functions env add publish-instagram WEB_BASE_URL https://api.example.com
 *   npx sanity@latest functions env add publish-instagram INTERNAL_API_SECRET <secret>
 *   npx sanity@latest functions env add schedule-posts WEB_BASE_URL https://api.example.com
 *   npx sanity@latest functions env add schedule-posts INTERNAL_API_SECRET <secret>
 */

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`sanity.blueprint.ts: set ${name} in the environment before running blueprint commands.`)
  return value
}

const organizationId = requireEnv('SANITY_ORGANIZATION_ID')
const projectId = requireEnv('SANITY_PROJECT_ID')
const dataset = requireEnv('SANITY_DATASET')

const functionEnv = {SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset}
/** Must match WORKFLOW_TAG in packages/workflows and the tag in sanity.workflow.ts. */
const workflowTag = 'prod'
const robotToken = '$.resources.social-publisher.token'

export default defineBlueprint({
  organizationId,
  values: {projectId, dataset},
  resources: [
    defineRobotToken({
      name: 'social-publisher',
      label: 'Social Studio publisher',
      memberships: [{resourceType: 'project', resourceId: projectId, roleNames: ['editor']}],
    }),
    defineScheduledFunction({
      name: 'schedule-posts',
      src: 'functions/schedule-posts',
      event: {expression: '*/5 * * * *'},
      timezone: 'UTC',
      timeout: 60,
      robotToken,
      env: functionEnv,
    }),
    definePubSubFunction({
      name: 'publish-instagram',
      src: 'functions/publish-instagram',
      project: projectId,
      timeout: 300,
      memory: 1,
      robotToken,
      env: functionEnv,
    }),
    // Workflows definitions are deployed separately (`pnpm workflows:deploy`): the Blueprints service
    // does not register the sanity.workflow resource yet.
    defineDocumentFunction({
      name: 'sync-workflow-status',
      src: 'functions/sync-workflow-status',
      project: projectId,
      timeout: 30,
      robotToken,
      event: {
        on: ['create', 'update'],
        filter: `_type == "sanity.workflow.instance" && tag == "${workflowTag}" && definition == "social-post-review" && delta::changedAny(currentStage)`,
        projection: '{_id, currentStage, "subject": fields[_type == "subject"][0].value.id}',
        resource: {type: 'dataset', id: `${projectId}.${dataset}`},
      },
    }),
  ],
})
