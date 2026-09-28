import {ErrorOutlineIcon} from '@sanity/icons/ErrorOutline'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {ReactNode} from 'react'

export function LoadingState({label = 'Loading…', fill}: {label?: string; fill?: boolean}) {
  return (
    <Flex align="center" justify="center" gap={3} padding={4} style={fill ? {height: '100%'} : undefined}>
      <Text size={1} muted>
        <Spinner />
      </Text>
      <Text size={1} muted>
        {label}
      </Text>
    </Flex>
  )
}

export function EmptyState({title, description, action}: {title: string; description?: ReactNode; action?: ReactNode}) {
  return (
    <Flex align="center" justify="center" padding={5}>
      <Stack gap={3} style={{maxWidth: 360, textAlign: 'center'}}>
        <Text size={1} weight="medium">
          {title}
        </Text>
        {description && (
          <Text size={1} muted>
            {description}
          </Text>
        )}
        {action && <Box paddingTop={2}>{action}</Box>}
      </Stack>
    </Flex>
  )
}

export function ErrorState({title, error, onRetry}: {title: string; error: unknown; onRetry?: () => void}) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <Card tone="critical" border radius={2} padding={3}>
      <Flex gap={3} align="flex-start">
        <Text size={1}>
          <ErrorOutlineIcon />
        </Text>
        <Stack gap={2} flex={1}>
          <Text size={1} weight="medium">
            {title}
          </Text>
          <Text size={1} muted>
            {message}
          </Text>
        </Stack>
        {onRetry && <Button mode="ghost" fontSize={1} padding={2} text="Retry" onClick={onRetry} />}
      </Flex>
    </Card>
  )
}

/** Inline notice for configuration/development states. Never used to fake success. */
export function Notice({tone = 'caution', title, children}: {tone?: 'caution' | 'critical' | 'primary' | 'default'; title: string; children?: ReactNode}) {
  return (
    <Card tone={tone} border radius={2} padding={3}>
      <Stack gap={2}>
        <Text size={1} weight="medium">
          {title}
        </Text>
        {children && (
          <Text size={1} muted>
            {children}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
