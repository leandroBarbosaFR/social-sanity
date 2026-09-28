import {schemaTypes} from '@social-studio/sanity-schema'
import {visionTool} from '@sanity/vision'
import {workflowDefaultDocumentNode, workflowStudioPlugin} from '@sanity/workflow-studio-plugin'
import {POST_REVIEW_WORKFLOW, WORKFLOW_TAG} from '@social-studio/workflows'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? ''
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'

/**
 * Admin Studio for the Social Studio content model. Day-to-day work happens in the Sanity app
 * (`apps/sanity-app`); this Studio exists to deploy the schema, for raw data administration, and to
 * inspect post review workflows (Workflows tool + per-document Workflows view). It is also the
 * Studio Content Agent registers against, so deploy it and open it once.
 */
export default defineConfig({
  name: 'social-studio',
  title: 'Social Studio (admin)',
  projectId,
  dataset,
  plugins: [
    structureTool({defaultDocumentNode: workflowDefaultDocumentNode()}),
    workflowStudioPlugin({
      tag: WORKFLOW_TAG,
      mappings: [{docType: 'socialPost', definition: POST_REVIEW_WORKFLOW, label: 'Post review'}],
    }),
    visionTool(),
  ],
  schema: {types: schemaTypes},
})
