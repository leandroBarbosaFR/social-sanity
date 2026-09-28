import 'server-only'
import {createEngine} from '@sanity/workflow-engine'
import {postGdrUri, WORKFLOW_TAG, workflowResource} from '@social-studio/workflows'
import {getSanityConfig} from './env'
import {logger} from './log'
import {getSanityClient} from './sanity'

/**
 * Nudges the post's review workflow after the publishing service changed the post, so a
 * condition that reads the post (e.g. "published" completes the review) is re-evaluated now
 * instead of the next time someone opens it. Best effort: publishing never fails because of it.
 */
export async function tickPostWorkflows(postId: string): Promise<void> {
  try {
    const {projectId, dataset} = getSanityConfig()
    const engine = createEngine({
      client: getSanityClient(),
      tag: WORKFLOW_TAG,
      workflowResource: workflowResource(projectId, dataset),
      executionContext: {kind: 'server', id: 'social-studio-web'},
    })
    const instances = await engine.instancesForDocument({document: postGdrUri(projectId, dataset, postId)})
    for (const instance of instances) {
      const result = await engine.tick({instanceId: instance._id})
      if (result.changed) logger.info('workflow_ticked', {postId, instanceId: instance._id, stage: result.instance.currentStage})
    }
  } catch (error) {
    logger.warn('workflow_tick_failed', {postId, error})
  }
}
