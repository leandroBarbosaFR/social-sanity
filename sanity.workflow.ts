import type {WorkflowDeploymentInput} from '@sanity/workflow-engine'
import {defineWorkflowConfig} from '@sanity/workflow-engine/define'

import {postReview, WORKFLOW_TAG, workflowResource} from './packages/workflows/src'

/**
 * Sanity Workflows deployment, read by `pnpm workflows:deploy` (the `sanity-workflows` CLI).
 * Uses SANITY_PROJECT_ID / SANITY_DATASET from the root .env, like sanity.blueprint.ts.
 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`sanity.workflow.ts: set ${name} in the environment (root .env).`)
  return value
}

export const production = {
  name: 'production',
  tag: WORKFLOW_TAG,
  // A reviewed literal: every runtime sharing this dataset (Sanity app, admin Studio, backend,
  // functions, CLI) runs Workflows 0.35, which reads model 10. Required subjects need 10.
  // Raise it only after upgrading all of them (https://www.sanity.io/docs/workflows/upgrade).
  expectedMinReaderModel: 10,
  workflowResource: workflowResource(requireEnv('SANITY_PROJECT_ID'), requireEnv('SANITY_DATASET')),
  definitions: [postReview],
} satisfies WorkflowDeploymentInput

export default defineWorkflowConfig({deployments: [production]})
