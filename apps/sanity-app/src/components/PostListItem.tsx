import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {PUBLISHING_ERRORS, isPublishingErrorCode} from '@social-studio/shared'

import {formatDateTime, formatRelative} from '../lib/dates'
import type {PostSummary} from '../lib/queries'
import {useRouter} from '../lib/router'
import {FormatLabel} from './FormatLabel'
import {StatusBadge} from './StatusBadge'

/** One clickable post row for dashboard lists. */
export function PostListItem({post, meta = 'scheduled'}: {post: PostSummary; meta?: 'scheduled' | 'updated' | 'error'}) {
  const {navigate} = useRouter()
  const errorLabel =
    post.errorCode && isPublishingErrorCode(post.errorCode) ? PUBLISHING_ERRORS[post.errorCode].label : post.errorMessage

  return (
    <Card
      as="button"
      type="button"
      paddingX={3}
      paddingY={2}
      onClick={() => navigate({name: 'post', id: post._id})}
      style={{width: '100%', textAlign: 'left'}}
    >
      <Flex align="center" gap={3}>
        <Stack gap={2} flex={1} style={{minWidth: 0}}>
          <Text size={1} weight="medium" textOverflow="ellipsis">
            {post.title || 'Untitled post'}
          </Text>
          <Text size={1} muted textOverflow="ellipsis">
            {meta === 'error' && errorLabel
              ? `${post.clientName ?? 'No client'} · ${errorLabel}`
              : post.clientName ?? 'No client'}
          </Text>
        </Stack>
        <Box style={{flex: 'none', width: 90}}>
          <FormatLabel format={post.format} />
        </Box>
        <Box style={{flex: 'none', width: 120}}>
          <StatusBadge status={post.workflowStatus} />
        </Box>
        <Box style={{flex: 'none', width: 110, textAlign: 'right'}}>
          <Text size={1} muted>
            {meta === 'updated'
              ? formatRelative(post._updatedAt)
              : post.scheduledAt
                ? formatDateTime(post.scheduledAt)
                : 'Not scheduled'}
          </Text>
        </Box>
      </Flex>
    </Card>
  )
}
