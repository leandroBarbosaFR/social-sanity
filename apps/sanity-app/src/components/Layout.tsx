import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import type {ReactNode} from 'react'

/** Page header: compact title row with a hairline divider, like a Studio pane header. */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <Card borderBottom paddingX={4} paddingY={3} style={{flex: 'none'}}>
      <Stack gap={3}>
        <Flex align="center" gap={3} style={{minHeight: 33}}>
          <Stack gap={2} flex={1} style={{minWidth: 0}}>
            <Text size={2} weight="semibold" textOverflow="ellipsis">
              {title}
            </Text>
            {description && (
              <Text size={1} muted textOverflow="ellipsis">
                {description}
              </Text>
            )}
          </Stack>
          {actions && (
            <Flex gap={2} align="center" style={{flex: 'none'}}>
              {actions}
            </Flex>
          )}
        </Flex>
        {children}
      </Stack>
    </Card>
  )
}

/** Scrollable page body under a PageHeader. */
export function PageBody({children, padding = 4}: {children: ReactNode; padding?: number}) {
  return (
    <Box flex={1} padding={padding} style={{overflow: 'auto', minHeight: 0}}>
      {children}
    </Box>
  )
}

export function Page({children}: {children: ReactNode}) {
  return (
    <Flex direction="column" style={{height: '100%', minWidth: 0}}>
      {children}
    </Flex>
  )
}

/** A bordered panel with a small header row. */
export function Section({
  title,
  count,
  actions,
  children,
  tone,
}: {
  title: ReactNode
  count?: number
  actions?: ReactNode
  children: ReactNode
  tone?: 'critical' | 'caution' | 'default'
}) {
  return (
    <Card border radius={2} overflow="hidden" tone={tone}>
      <Card borderBottom paddingX={3} paddingY={2} tone={tone}>
        <Flex align="center" gap={2} style={{minHeight: 25}}>
          <Text size={1} weight="medium">
            {title}
          </Text>
          {count !== undefined && (
            <Text size={1} muted>
              {count}
            </Text>
          )}
          <Box flex={1} />
          {actions}
        </Flex>
      </Card>
      {children}
    </Card>
  )
}

export function FieldLabel({label, description, htmlFor}: {label: string; description?: ReactNode; htmlFor?: string}) {
  return (
    <Stack gap={2}>
      <Text as="label" htmlFor={htmlFor} size={1} weight="medium">
        {label}
      </Text>
      {description && (
        <Text size={1} muted>
          {description}
        </Text>
      )}
    </Stack>
  )
}
