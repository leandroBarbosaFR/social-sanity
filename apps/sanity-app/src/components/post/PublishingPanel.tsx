import {LaunchIcon} from '@sanity/icons/Launch'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {isPublishingErrorCode, PUBLISHING_ERRORS} from '@social-studio/shared'

import {formatDateTime, formatRelative} from '../../lib/dates'
import type {PostDocument} from '../../lib/types'
import {Section} from '../Layout'
import {StatusDot} from '../StatusBadge'

function MockNote() {
  return (
    <Text size={1} muted>
      Mock mode: this run used the development Instagram client. Nothing was posted to Instagram.
    </Text>
  )
}

/** Live publishing state for a post. Failures are always explained, never hidden. */
export function PublishingPanel({doc, onRetry}: {doc: PostDocument; onRetry: () => void}) {
  const status = doc.workflowStatus
  const error = doc.publishingError
  const history = [...(doc.publishingHistory ?? [])].reverse()
  const run = doc.publishing

  if (!error && history.length === 0 && status !== 'publishing' && status !== 'published') return null

  const errorInfo = error && isPublishingErrorCode(error.code) ? PUBLISHING_ERRORS[error.code] : null

  return (
    <Stack gap={3}>
      {status === 'publishing' && (
        <Card tone="primary" border radius={2} padding={3}>
          <Flex gap={3} align="center">
            <Text size={1}>
              <Spinner />
            </Text>
            <Text size={1}>
              Publishing{run?.attempt ? ` (attempt ${run.attempt})` : ''}
              {run?.startedAt ? `, started ${formatRelative(run.startedAt)}` : ''}. The post is locked until it finishes.
            </Text>
          </Flex>
        </Card>
      )}

      {status === 'published' && (
        <Card tone={run?.mode === 'mock' ? 'caution' : 'positive'} border radius={2} padding={3}>
          <Stack gap={3}>
            <Flex align="center" gap={2}>
              <Text size={1} weight="medium" style={{flex: 1}}>
                {run?.mode === 'mock' ? 'Mock published' : 'Published'}
                {doc.publishedAt ? ` ${formatDateTime(doc.publishedAt)}` : ''}
              </Text>
              {doc.instagramPermalink && (
                <Button as="a" href={doc.instagramPermalink} target="_blank" rel="noreferrer" mode="bleed" icon={LaunchIcon} text="Open" fontSize={1} padding={2} />
              )}
            </Flex>
            {doc.instagramMediaId ? (
              <Text size={1} muted>
                Instagram media ID {doc.instagramMediaId}
              </Text>
            ) : (
              run?.mode !== 'mock' && (
                <Text size={1} muted>
                  The media ID could not be recovered for this post.
                </Text>
              )
            )}
            {run?.mode === 'mock' && <MockNote />}
          </Stack>
        </Card>
      )}

      {status === 'failed' && error && (
        <Card tone="critical" border radius={2} padding={3}>
          <Stack gap={3}>
            <Flex align="center" gap={2}>
              <Text size={1} weight="medium" style={{flex: 1}}>
                {errorInfo?.label ?? 'Publishing failed'}
              </Text>
              <Button tone="critical" text="Retry" fontSize={1} padding={2} onClick={onRetry} />
            </Flex>
            {errorInfo && (
              <Text size={1} muted>
                {errorInfo.hint}
              </Text>
            )}
            <Card radius={2} padding={2} tone="transparent" border>
              <Text size={1} style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                {error.message}
              </Text>
            </Card>
            <Text size={0} muted>
              {[
                error.occurredAt ? formatDateTime(error.occurredAt) : null,
                doc.publishingAttempts ? `${doc.publishingAttempts} attempt${doc.publishingAttempts === 1 ? '' : 's'}` : null,
                error.providerCode ? `Meta code ${error.providerCode}` : null,
                error.retryable ? 'Retryable' : 'Needs a fix before retrying',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Stack>
        </Card>
      )}

      {history.length > 0 && (
        <Section title="Publishing history" count={history.length}>
          <Stack>
            {history.map((entry, index) => (
              <Card key={entry._key} borderTop={index > 0} paddingX={3} paddingY={2}>
                <Flex align="center" gap={3}>
                  <StatusDot tone={entry.outcome === 'published' ? 'positive' : 'critical'} />
                  <Text size={1} style={{width: 72, flex: 'none'}}>
                    Attempt {entry.attempt}
                  </Text>
                  <Box flex={1} style={{minWidth: 0}}>
                    <Text size={1} muted textOverflow="ellipsis">
                      {entry.outcome === 'published' ? 'Published' : entry.errorCode && isPublishingErrorCode(entry.errorCode) ? PUBLISHING_ERRORS[entry.errorCode].label : 'Failed'}
                      {entry.mode === 'mock' ? ' (mock)' : ''}
                      {entry.trigger ? ` · ${entry.trigger === 'schedule' ? 'Scheduled' : 'Manual'}` : ''}
                    </Text>
                  </Box>
                  <Text size={1} muted style={{flex: 'none'}}>
                    {formatDateTime(entry.startedAt)}
                  </Text>
                </Flex>
              </Card>
            ))}
          </Stack>
        </Section>
      )}
    </Stack>
  )
}
