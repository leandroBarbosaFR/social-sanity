import {SanityApp, type SanityConfig} from '@sanity/sdk-react'
import {ToastProvider} from '@sanity/ui/toast'

import {AppShell} from './components/shell/AppShell'
import {EmptyState, LoadingState} from './components/States'
import {appConfig, isProjectConfigured} from './config'
import {RouterProvider} from './lib/router'
import {WorkflowEngineProvider} from './lib/workflow'
import {WorkspaceProvider} from './lib/workspace'
import {SanityUI} from './SanityUI'

const config: SanityConfig[] = [{projectId: appConfig.projectId, dataset: appConfig.dataset}]

export default function App() {
  return (
    <SanityUI>
      <ToastProvider zOffset={1000}>
        {isProjectConfigured ? (
          <SanityApp config={config} fallback={<LoadingState label="Connecting to Sanity…" fill />}>
            <WorkflowEngineProvider>
              <RouterProvider>
                <WorkspaceProvider>
                  <AppShell />
                </WorkspaceProvider>
              </RouterProvider>
            </WorkflowEngineProvider>
          </SanityApp>
        ) : (
          <EmptyState
            title="Sanity project not configured"
            description="Set SANITY_APP_PROJECT_ID and SANITY_APP_DATASET in apps/sanity-app/.env, then restart the dev server."
          />
        )}
      </ToastProvider>
    </SanityUI>
  )
}
