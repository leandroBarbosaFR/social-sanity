import {refDataset, StartNotAllowedError, type Engine} from '@sanity/workflow-engine'
import {useDocumentWorkflows, useWorkflowEngine} from '@sanity/workflow-sdk'
import {POST_REVIEW_WORKFLOW, postGdrUri, WORKFLOW_TAG, workflowResource} from '@social-studio/workflows'
import {createContext, useCallback, useContext, useMemo, type ReactNode} from 'react'

import {appConfig} from '../config'

/**
 * Sanity Workflows in the app: one engine per session, bound to the content dataset (engine
 * documents live beside the posts) and the shared deployment tag. Every commit runs as the signed-in
 * user. Engine checks are advisory; the Content Lake is what enforces writes.
 */
const EngineContext = createContext<Engine | null>(null)

export function WorkflowEngineProvider({children}: {children: ReactNode}) {
  const resource = useMemo(() => workflowResource(appConfig.projectId, appConfig.dataset), [])
  const engine = useWorkflowEngine({workflowResource: resource, tag: WORKFLOW_TAG})
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
}

export function useEngine(): Engine {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useEngine must be used inside WorkflowEngineProvider')
  return engine
}

/** The in-flight review workflow for a post (live), if any. */
export function usePostReview(postId: string): {instanceId: string | null; loading: boolean; error: unknown} {
  const engine = useEngine()
  const document = postGdrUri(appConfig.projectId, appConfig.dataset, postId)
  const {instances, loading, error} = useDocumentWorkflows({engine, document})
  const instance = instances?.find((candidate) => candidate.definition === POST_REVIEW_WORKFLOW)
  return {instanceId: instance?._id ?? null, loading, error}
}

/** Starts the review workflow for a post. A concurrent start by someone else is not an error. */
export function useStartPostReview() {
  const engine = useEngine()
  return useCallback(
    async (postId: string): Promise<void> => {
      const subject = refDataset({
        projectId: appConfig.projectId,
        dataset: appConfig.dataset,
        documentId: postId.replace(/^drafts\./, ''),
        type: 'socialPost',
      })
      try {
        await engine.startInstance({
          definition: POST_REVIEW_WORKFLOW,
          initialFields: [{type: 'subject', name: 'subject', value: subject}],
        })
      } catch (error) {
        if (error instanceof StartNotAllowedError) return
        throw error
      }
    },
    [engine],
  )
}
