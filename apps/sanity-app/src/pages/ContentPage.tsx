import {Box, Button, Flex, Select, Stack, Tab, TabList} from '@sanity/ui'
import {useDocuments, useQuery} from '@sanity/sdk-react'
import {POST_FORMAT_LABELS, POST_FORMATS, STATUS_FILTERS, type StatusFilterId} from '@social-studio/shared'
import {Suspense, useMemo, useState} from 'react'

import {ContentRow, ContentTableHeader, RowSkeleton} from '../components/ContentTable'
import {Page, PageBody, PageHeader} from '../components/Layout'
import {EmptyState, LoadingState} from '../components/States'
import {addDays, startOfDay, startOfMonth} from '../lib/dates'
import {CAMPAIGN_OPTIONS_QUERY, CLIENT_OPTIONS_QUERY, type CampaignOption, type ClientOption} from '../lib/queries'
import {useCreateAndOpen} from '../lib/useCreate'
import {useWorkspace} from '../lib/workspace'

type DateFilter = 'any' | 'next7' | 'thisMonth' | 'past' | 'unscheduled'

const DATE_FILTERS: {id: DateFilter; label: string}[] = [
  {id: 'any', label: 'Any date'},
  {id: 'next7', label: 'Next 7 days'},
  {id: 'thisMonth', label: 'This month'},
  {id: 'past', label: 'Past'},
  {id: 'unscheduled', label: 'Not scheduled'},
]

function isStatusFilter(value: string | undefined): value is StatusFilterId {
  return STATUS_FILTERS.some((filter) => filter.id === value)
}

function ClientFilterSelect({value, onChange}: {value: string; onChange: (value: string) => void}) {
  const {data} = useQuery<ClientOption[]>({query: CLIENT_OPTIONS_QUERY})
  return (
    <Select fontSize={1} padding={2} value={value} onChange={(event) => onChange(event.currentTarget.value)} aria-label="Client">
      <option value="">All clients</option>
      {data.map((client) => (
        <option key={client._id} value={client._id}>
          {client.name ?? 'Untitled client'}
        </option>
      ))}
    </Select>
  )
}

function CampaignFilterSelect({clientId, value, onChange}: {clientId: string; value: string; onChange: (value: string) => void}) {
  const {data} = useQuery<CampaignOption[]>({query: CAMPAIGN_OPTIONS_QUERY, params: {clientId: clientId || null}})
  return (
    <Select fontSize={1} padding={2} value={value} onChange={(event) => onChange(event.currentTarget.value)} aria-label="Campaign">
      <option value="">All campaigns</option>
      {data.map((campaign) => (
        <option key={campaign._id} value={campaign._id}>
          {campaign.title ?? 'Untitled campaign'}
        </option>
      ))}
    </Select>
  )
}

const disabledSelect = (label: string) => (
  <Select fontSize={1} padding={2} disabled aria-label={label}>
    <option>{label}</option>
  </Select>
)

interface ListFilters {
  status: StatusFilterId
  clientId: string
  campaignId: string
  format: string
  date: DateFilter
  sort: 'updated' | 'scheduled'
}

function ContentList({filters, search}: {filters: ListFilters; search: string}) {
  const create = useCreateAndOpen()
  // Date windows are fixed per filter change so the query stays stable.
  const {filter, params} = useMemo(() => {
    const clauses: string[] = []
    const queryParams: Record<string, unknown> = {}
    const statuses = STATUS_FILTERS.find((entry) => entry.id === filters.status)?.statuses
    if (statuses) {
      clauses.push('workflowStatus in $statuses')
      queryParams.statuses = statuses
    }
    if (filters.clientId) {
      clauses.push('client._ref == $clientId')
      queryParams.clientId = filters.clientId
    }
    if (filters.campaignId) {
      clauses.push('campaign._ref == $campaignId')
      queryParams.campaignId = filters.campaignId
    }
    if (filters.format) {
      clauses.push('format == $format')
      queryParams.format = filters.format
    }
    const now = new Date()
    switch (filters.date) {
      case 'next7':
        clauses.push('scheduledAt >= $from && scheduledAt < $to')
        queryParams.from = now.toISOString()
        queryParams.to = addDays(startOfDay(now), 8).toISOString()
        break
      case 'thisMonth': {
        const monthStart = startOfMonth(now)
        clauses.push('scheduledAt >= $from && scheduledAt < $to')
        queryParams.from = monthStart.toISOString()
        queryParams.to = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString()
        break
      }
      case 'past':
        clauses.push('scheduledAt < $from')
        queryParams.from = now.toISOString()
        break
      case 'unscheduled':
        clauses.push('!defined(scheduledAt)')
        break
      default:
        break
    }
    return {filter: clauses.join(' && ') || undefined, params: queryParams}
  }, [filters])

  const {data, hasMore, loadMore, isPending} = useDocuments({
    documentType: 'socialPost',
    filter,
    params,
    search: search || undefined,
    batchSize: 40,
    orderings:
      filters.sort === 'scheduled'
        ? [{field: 'scheduledAt', direction: 'asc'}]
        : [{field: '_updatedAt', direction: 'desc'}],
  })

  if (data.length === 0) {
    return (
      <EmptyState
        title="No content matches"
        description={search ? `Nothing matches “${search}” with the current filters.` : 'Try another filter, or create a post.'}
        action={<Button text="Create post" mode="ghost" fontSize={1} padding={2} onClick={() => void create('socialPost')} />}
      />
    )
  }

  return (
    <Stack>
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
    </Stack>
  )
}

export function ContentPage({initialStatus}: {initialStatus?: string}) {
  const {clientId: workspaceClientId, search, setSearch} = useWorkspace()
  const [filters, setFilters] = useState<ListFilters>({
    status: isStatusFilter(initialStatus) ? initialStatus : 'all',
    clientId: workspaceClientId ?? '',
    campaignId: '',
    format: '',
    date: 'any',
    sort: 'updated',
  })
  const update = (patch: Partial<ListFilters>) => setFilters((current) => ({...current, ...patch}))

  return (
    <Page>
      <PageHeader title="Content" description={search ? `Searching for “${search}”` : undefined}
        actions={search ? <Button mode="bleed" fontSize={1} padding={2} text="Clear search" onClick={() => setSearch('')} /> : undefined}
      >
        <Flex gap={3} align="center" wrap="wrap">
          <TabList gap={1}>
            {STATUS_FILTERS.map((entry) => (
              <Tab
                key={entry.id}
                id={`status-${entry.id}`}
                aria-controls="content-list"
                label={entry.label}
                fontSize={1}
                padding={2}
                selected={filters.status === entry.id}
                onClick={() => update({status: entry.id})}
              />
            ))}
          </TabList>
          <Box flex={1} />
          <Flex gap={2} wrap="wrap">
            <Box style={{width: 150}}>
              <Suspense fallback={disabledSelect('All clients')}>
                <ClientFilterSelect value={filters.clientId} onChange={(clientId) => update({clientId, campaignId: ''})} />
              </Suspense>
            </Box>
            <Box style={{width: 150}}>
              <Suspense fallback={disabledSelect('All campaigns')}>
                <CampaignFilterSelect clientId={filters.clientId} value={filters.campaignId} onChange={(campaignId) => update({campaignId})} />
              </Suspense>
            </Box>
            <Box style={{width: 120}}>
              <Select fontSize={1} padding={2} value={filters.format} onChange={(event) => update({format: event.currentTarget.value})} aria-label="Format">
                <option value="">All formats</option>
                {POST_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {POST_FORMAT_LABELS[format]}
                  </option>
                ))}
              </Select>
            </Box>
            <Box style={{width: 130}}>
              <Select
                fontSize={1}
                padding={2}
                value={filters.date}
                onChange={(event) => update({date: event.currentTarget.value as DateFilter})}
                aria-label="Date"
              >
                {DATE_FILTERS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Box>
            <Box style={{width: 140}}>
              <Select
                fontSize={1}
                padding={2}
                value={filters.sort}
                onChange={(event) => update({sort: event.currentTarget.value === 'scheduled' ? 'scheduled' : 'updated'})}
                aria-label="Sort"
              >
                <option value="updated">Recently updated</option>
                <option value="scheduled">Scheduled time</option>
              </Select>
            </Box>
          </Flex>
        </Flex>
      </PageHeader>
      <PageBody padding={0}>
        <Box id="content-list" style={{minWidth: 900}}>
          <ContentTableHeader />
          <Suspense fallback={<LoadingState label="Loading content…" />}>
            <ContentList filters={filters} search={search} />
          </Suspense>
        </Box>
      </PageBody>
    </Page>
  )
}
