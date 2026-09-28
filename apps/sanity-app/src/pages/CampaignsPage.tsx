import {AddIcon} from '@sanity/icons/Add'
import {Box, Button, Card, Flex, Stack, Text, TextSkeleton} from '@sanity/ui'
import {useDocumentProjection, useDocuments, type DocumentHandle} from '@sanity/sdk-react'
import {Suspense, useRef, type CSSProperties} from 'react'

import {Page, PageBody, PageHeader} from '../components/Layout'
import {EmptyState, LoadingState} from '../components/States'
import {ToneLabel} from '../components/StatusBadge'
import {formatDate} from '../lib/dates'
import {useRouter} from '../lib/router'
import {useCreateAndOpen} from '../lib/useCreate'
import {useWorkspace} from '../lib/workspace'

const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 2fr) minmax(140px, 1fr) 110px minmax(180px, 1fr) 70px 80px',
  alignItems: 'center',
  columnGap: 12,
}

export const CAMPAIGN_STATUS_TONES = {
  planned: 'default',
  active: 'primary',
  completed: 'positive',
  archived: 'default',
} as const

type CampaignStatus = keyof typeof CAMPAIGN_STATUS_TONES

interface CampaignRowData {
  title: string | null
  status: CampaignStatus | null
  startDate: string | null
  endDate: string | null
  clientName: string | null
  postCount: number
  scheduledCount: number
}

const CAMPAIGN_ROW = `{
  title, status, startDate, endDate,
  "clientName": client->name,
  "postCount": count(*[_type == "socialPost" && campaign._ref == ^._id]),
  "scheduledCount": count(*[_type == "socialPost" && campaign._ref == ^._id && workflowStatus == "scheduled"])
}`

function CampaignRow(handle: DocumentHandle) {
  const ref = useRef<HTMLButtonElement>(null)
  const {navigate} = useRouter()
  const {data} = useDocumentProjection<CampaignRowData>({...handle, ref, projection: CAMPAIGN_ROW})
  const status = data?.status ?? 'planned'
  return (
    <Card
      ref={ref}
      as="button"
      type="button"
      borderBottom
      paddingX={3}
      paddingY={2}
      onClick={() => navigate({name: 'campaign', id: handle.documentId})}
      style={{width: '100%', textAlign: 'left', minHeight: 41}}
    >
      <Box style={GRID}>
        <Text size={1} weight="medium" textOverflow="ellipsis">
          {data?.title || 'Untitled campaign'}
        </Text>
        <Text size={1} muted textOverflow="ellipsis">
          {data?.clientName ?? '—'}
        </Text>
        <ToneLabel tone={CAMPAIGN_STATUS_TONES[status]} label={status.charAt(0).toUpperCase() + status.slice(1)} />
        <Text size={1} muted textOverflow="ellipsis">
          {data?.startDate ? formatDate(data.startDate) : '—'} – {data?.endDate ? formatDate(data.endDate) : '—'}
        </Text>
        <Text size={1} muted>
          {data?.postCount ?? 0}
        </Text>
        <Text size={1} muted>
          {data?.scheduledCount ?? 0}
        </Text>
      </Box>
    </Card>
  )
}

export function CampaignTable({filter, params}: {filter?: string; params?: Record<string, unknown>}) {
  const {data, hasMore, loadMore, isPending} = useDocuments({
    documentType: 'campaign',
    filter,
    params,
    batchSize: 50,
    orderings: [{field: 'startDate', direction: 'desc'}],
  })
  return (
    <Box style={{overflowX: 'auto'}}>
      <Box style={{minWidth: 760}}>
        <Card borderBottom paddingX={3} paddingY={2} tone="transparent">
          <Box style={GRID}>
            {['Campaign', 'Client', 'Status', 'Dates', 'Posts', 'Scheduled'].map((column) => (
              <Text key={column} size={1} muted weight="medium">
                {column}
              </Text>
            ))}
          </Box>
        </Card>
        {data.length === 0 && <EmptyState title="No campaigns" description="Campaigns group posts around a goal and a date range." />}
        <Stack>
          {data.map((handle) => (
            <Suspense
              key={handle.documentId}
              fallback={
                <Card borderBottom paddingX={3} paddingY={3}>
                  <TextSkeleton size={1} animated radius={1} style={{width: 200}} />
                </Card>
              }
            >
              <CampaignRow {...handle} />
            </Suspense>
          ))}
        </Stack>
        {hasMore && (
          <Flex justify="center" padding={3}>
            <Button mode="ghost" fontSize={1} padding={2} text="Load more" disabled={isPending} onClick={loadMore} />
          </Flex>
        )}
      </Box>
    </Box>
  )
}

export function CampaignsPage() {
  const create = useCreateAndOpen()
  const {clientId} = useWorkspace()
  return (
    <Page>
      <PageHeader
        title="Campaigns"
        actions={<Button icon={AddIcon} text="New campaign" mode="ghost" fontSize={1} padding={2} onClick={() => void create('campaign')} />}
      />
      <PageBody padding={0}>
        <Suspense fallback={<LoadingState label="Loading campaigns…" />}>
          <CampaignTable filter={clientId ? 'client._ref == $clientId' : undefined} params={clientId ? {clientId} : undefined} />
        </Suspense>
      </PageBody>
    </Page>
  )
}
