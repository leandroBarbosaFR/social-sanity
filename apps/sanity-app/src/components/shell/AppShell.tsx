import {Box, Card, Flex, useMediaIndex} from '@sanity/ui'
import {Suspense, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'

import {toPath, useRouter} from '../../lib/router'
import {AssistantPanel} from '../assistant/AssistantPanel'
import {PageRouter} from '../../pages/PageRouter'
import {ErrorState, LoadingState} from '../States'
import {NavPane} from './NavPane'
import {TopBar} from './TopBar'

export function AppShell() {
  const {route} = useRouter()
  // Below the "medium" breakpoint the navigation collapses to icons.
  const compact = useMediaIndex() < 2
  const [assistantOpen, setAssistantOpen] = useState(false)

  return (
    <Card style={{height: '100vh'}}>
      <Flex style={{height: '100%'}}>
        <NavPane compact={compact} />
        <Flex direction="column" flex={1} style={{minWidth: 0, height: '100%'}}>
          <TopBar assistantOpen={assistantOpen} onToggleAssistant={() => setAssistantOpen((open) => !open)} />
          <Box flex={1} style={{minHeight: 0}}>
            <ErrorBoundary
              resetKeys={[toPath(route)]}
              fallbackRender={({error, resetErrorBoundary}) => (
                <Box padding={4}>
                  <ErrorState title="This view failed to load" error={error} onRetry={resetErrorBoundary} />
                </Box>
              )}
            >
              <Suspense fallback={<LoadingState fill />}>
                <PageRouter />
              </Suspense>
            </ErrorBoundary>
          </Box>
        </Flex>
        {assistantOpen && <AssistantPanel onClose={() => setAssistantOpen(false)} />}
      </Flex>
    </Card>
  )
}
