import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {PlayIcon} from '@sanity/icons/Play'
import {Box, Button, Card, Flex, Text, TextSkeleton} from '@sanity/ui'
import {useDocumentProjection, useDocuments, type DocumentHandle, type DocumentsOptions} from '@sanity/sdk-react'
import {Suspense, useRef, type CSSProperties, type ReactNode} from 'react'

import {formatDateTime, formatRelative} from '../lib/dates'
import {POST_ROW_PROJECTION, type PostRow} from '../lib/queries'
import {useRouter} from '../lib/router'
import {FormatLabel} from './FormatLabel'
import {InstagramGlyph} from './InstagramGlyph'
import {PublishingBadge, WorkflowStageBadge} from './StatusBadge'

export const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(200px, 2.2fr) minmax(110px, 1fr) minmax(110px, 1fr) 90px 120px 110px 120px 90px',
  alignItems: 'center',
  columnGap: 12,
}

export const COLUMNS = ['Content', 'Client', 'Campaign', 'Format', 'Workflow', 'Publishing', 'Scheduled', 'Updated']

function Thumb({url, type}: {url: string | null; type: string | null}) {
  const style: CSSProperties = {width: 28, height: 28, flex: 'none', overflow: 'hidden'}
  if (url && type === 'socialImage') {
    return (
      <Card radius={1} style={style}>
        <img src={`${url}?w=56&h=56&fit=crop`} alt="" width={28} height={28} style={{display: 'block', objectFit: 'cover'}} />
      </Card>
    )
  }
  return (
    <Card radius={1} tone="transparent" border style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Text size={1} muted>
        {type === 'socialVideo' ? <PlayIcon /> : <DocumentTextIcon />}
      </Text>
    </Card>
  )
}

export function RowSkeleton() {
  return (
    <Card borderBottom paddingX={3} paddingY={2} style={{height: 45}}>
      <Box style={GRID}>
        <TextSkeleton size={1} animated radius={1} />
        <TextSkeleton size={1} animated radius={1} />
      </Box>
    </Card>
  )
}

export function ContentRow(handle: DocumentHandle) {
  const ref = useRef<HTMLButtonElement>(null)
  const {navigate} = useRouter()
  const {data} = useDocumentProjection<PostRow>({...handle, ref, projection: POST_ROW_PROJECTION})

  return (
    <Card
      ref={ref}
      as="button"
      type="button"
      borderBottom
      paddingX={3}
      paddingY={2}
      onClick={() => navigate({name: 'post', id: handle.documentId})}
      style={{width: '100%', textAlign: 'left', minHeight: 45}}
    >
      <Box style={GRID}>
        <Flex align="center" gap={2} style={{minWidth: 0}}>
          <Thumb url={data?.thumbUrl ?? null} type={data?.thumbType ?? null} />
          <Text size={1} weight="medium" textOverflow="ellipsis">
            {data?.title || 'Untitled post'}
          </Text>
        </Flex>
        <Text size={1} muted textOverflow="ellipsis">
          {data?.clientName ?? '—'}
        </Text>
        <Text size={1} muted textOverflow="ellipsis">
          {data?.campaignTitle ?? '—'}
        </Text>
        <Flex align="center" gap={2}>
          {(data?.platforms ?? []).includes('instagram') && (
            <Text size={1} muted>
              <InstagramGlyph title="Instagram" />
            </Text>
          )}
          <FormatLabel format={data?.format} />
        </Flex>
        <WorkflowStageBadge status={data?.workflowStatus} />
        <PublishingBadge status={data?.workflowStatus} />
        <Text size={1} muted textOverflow="ellipsis">
          {data?.scheduledAt ? formatDateTime(data.scheduledAt) : '—'}
        </Text>
        <Text size={1} muted textOverflow="ellipsis">
          {data?._updatedAt ? formatRelative(data._updatedAt) : ''}
        </Text>
      </Box>
    </Card>
  )
}


export function ContentTableHeader() {
  return (
    <Card borderBottom paddingX={3} paddingY={2} tone="transparent" style={{position: 'sticky', top: 0, zIndex: 1}}>
      <Box style={GRID}>
        {COLUMNS.map((column) => (
          <Text key={column} size={1} muted weight="medium">
            {column}
          </Text>
        ))}
      </Box>
    </Card>
  )
}

/** A self-contained post table for a fixed filter (client or campaign pages). */
export function PostTable({options, empty}: {options: DocumentsOptions; empty: ReactNode}) {
  const {data, hasMore, loadMore, isPending} = useDocuments({batchSize: 30, orderings: [{field: '_updatedAt', direction: 'desc'}], ...options})
  return (
    <Box style={{overflowX: 'auto'}}>
      <Box style={{minWidth: 1000}}>
        <ContentTableHeader />
        {data.length === 0 && empty}
        {data.map((handle) => (
          <Suspense key={handle.documentId} fallback={<RowSkeleton />}>
            <ContentRow {...handle} />
          </Suspense>
        ))}
        {hasMore && (
          <Flex justify="center" padding={3}>
            <Button mode="ghost" fontSize={1} padding={2} text={isPending ? 'Loading…' : 'Load more'} disabled={isPending} onClick={loadMore} />
          </Flex>
        )}
      </Box>
    </Box>
  )
}
