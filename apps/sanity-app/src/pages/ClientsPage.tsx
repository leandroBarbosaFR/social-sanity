import {AddIcon} from '@sanity/icons/Add'
import {Box, Button, Card, Flex, Stack, Text, TextSkeleton} from '@sanity/ui'
import {useDocumentProjection, useDocuments, type DocumentHandle} from '@sanity/sdk-react'
import {Suspense, useRef, type CSSProperties} from 'react'

import {InstagramGlyph} from '../components/InstagramGlyph'
import {Page, PageBody, PageHeader} from '../components/Layout'
import {Monogram} from '../components/shell/ClientSwitcher'
import {EmptyState, LoadingState} from '../components/States'
import {ToneLabel} from '../components/StatusBadge'
import {useRouter} from '../lib/router'
import {useCreateAndOpen} from '../lib/useCreate'

const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 2fr) minmax(120px, 1fr) minmax(180px, 1.2fr) 90px 90px',
  alignItems: 'center',
  columnGap: 12,
}

interface ClientRowData {
  name: string | null
  industry: string | null
  status: string | null
  logoUrl: string | null
  instagram: {username: string | null; status: string | null} | null
  postCount: number
  upcoming: number
}

const CLIENT_ROW = `{
  name, industry, status,
  "logoUrl": logo.asset->url,
  "instagram": instagram{username, status},
  "postCount": count(*[_type == "socialPost" && client._ref == ^._id]),
  "upcoming": count(*[_type == "socialPost" && client._ref == ^._id && workflowStatus == "scheduled"])
}`

function ClientRow(handle: DocumentHandle) {
  const ref = useRef<HTMLButtonElement>(null)
  const {navigate} = useRouter()
  const {data} = useDocumentProjection<ClientRowData>({...handle, ref, projection: CLIENT_ROW})
  const ig = data?.instagram
  return (
    <Card
      ref={ref}
      as="button"
      type="button"
      borderBottom
      paddingX={3}
      paddingY={2}
      onClick={() => navigate({name: 'client', id: handle.documentId, tab: 'general'})}
      style={{width: '100%', textAlign: 'left', minHeight: 45}}
    >
      <Box style={GRID}>
        <Flex align="center" gap={2} style={{minWidth: 0}}>
          {data?.logoUrl ? (
            <Card radius={1} overflow="hidden" style={{width: 24, height: 24, flex: 'none'}}>
              <img src={`${data.logoUrl}?w=48&h=48&fit=crop`} alt="" width={24} height={24} style={{display: 'block'}} />
            </Card>
          ) : (
            <Monogram name={data?.name ?? null} size={24} />
          )}
          <Text size={1} weight="medium" textOverflow="ellipsis">
            {data?.name || 'Untitled client'}
          </Text>
          {data?.status && data.status !== 'active' && (
            <Text size={0} muted>
              {data.status}
            </Text>
          )}
        </Flex>
        <Text size={1} muted textOverflow="ellipsis">
          {data?.industry ?? '—'}
        </Text>
        <Flex align="center" gap={2} style={{minWidth: 0}}>
          <Text size={1} muted>
            <InstagramGlyph />
          </Text>
          {ig?.status === 'connected' ? (
            <Text size={1} textOverflow="ellipsis">
              @{ig.username}
            </Text>
          ) : ig?.status ? (
            <ToneLabel tone="critical" label={`@${ig.username ?? ''} · ${ig.status}`} />
          ) : (
            <Text size={1} muted>
              Not connected
            </Text>
          )}
        </Flex>
        <Text size={1} muted>
          {data?.postCount ?? 0}
        </Text>
        <Text size={1} muted>
          {data?.upcoming ?? 0}
        </Text>
      </Box>
    </Card>
  )
}

function ClientList() {
  const create = useCreateAndOpen()
  const {data, hasMore, loadMore, isPending} = useDocuments({
    documentType: 'client',
    batchSize: 50,
    orderings: [{field: 'name', direction: 'asc'}],
  })
  if (data.length === 0) {
    return (
      <EmptyState
        title="No clients yet"
        description="Clients hold brand guidelines, social accounts and campaigns."
        action={<Button icon={AddIcon} text="New client" mode="ghost" fontSize={1} padding={2} onClick={() => void create('client')} />}
      />
    )
  }
  return (
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
          <ClientRow {...handle} />
        </Suspense>
      ))}
      {hasMore && (
        <Flex justify="center" padding={3}>
          <Button mode="ghost" fontSize={1} padding={2} text="Load more" disabled={isPending} onClick={loadMore} />
        </Flex>
      )}
    </Stack>
  )
}

export function ClientsPage() {
  const create = useCreateAndOpen()
  return (
    <Page>
      <PageHeader
        title="Clients"
        actions={<Button icon={AddIcon} text="New client" mode="ghost" fontSize={1} padding={2} onClick={() => void create('client')} />}
      />
      <PageBody padding={0}>
        <Box style={{minWidth: 720}}>
          <Card borderBottom paddingX={3} paddingY={2} tone="transparent" style={{position: 'sticky', top: 0, zIndex: 1}}>
            <Box style={GRID}>
              {['Client', 'Industry', 'Instagram', 'Posts', 'Scheduled'].map((column) => (
                <Text key={column} size={1} muted weight="medium">
                  {column}
                </Text>
              ))}
            </Box>
          </Card>
          <Suspense fallback={<LoadingState label="Loading clients…" />}>
            <ClientList />
          </Suspense>
        </Box>
      </PageBody>
    </Page>
  )
}
