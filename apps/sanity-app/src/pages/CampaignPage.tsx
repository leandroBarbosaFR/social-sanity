import {AddIcon} from '@sanity/icons/Add'
import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {TrashIcon} from '@sanity/icons/Trash'
import {Box, Button, Card, Container, Flex, Select, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {deleteDocument, editDocument, useApplyDocumentActions, useDocument, useQuery, type DocumentHandle} from '@sanity/sdk-react'
import {Suspense, useId} from 'react'

import {PostTable} from '../components/ContentTable'
import {DocumentStateChips, SaveButton} from '../components/DocumentState'
import {SelectField, StringField, TagListField, TextField} from '../components/fields'
import {FieldLabel, Page, Section} from '../components/Layout'
import {EmptyState, LoadingState} from '../components/States'
import {errorMessage} from '../lib/backend'
import {CLIENT_OPTIONS_QUERY, type ClientOption} from '../lib/queries'
import {useRouter} from '../lib/router'
import type {Reference} from '../lib/types'
import {useCreateAndOpen} from '../lib/useCreate'

function CampaignClientField({handle}: {handle: DocumentHandle}) {
  const id = useId()
  const {data: client} = useDocument<Reference>({...handle, path: 'client'})
  const {data: clients} = useQuery<ClientOption[]>({query: CLIENT_OPTIONS_QUERY})
  const apply = useApplyDocumentActions()
  return (
    <Stack gap={3}>
      <FieldLabel label="Client" htmlFor={id} />
      <Select
        id={id}
        fontSize={1}
        padding={3}
        value={client?._ref ?? ''}
        onChange={(event) => {
          const next = event.currentTarget.value
          void apply(editDocument(handle, next ? {set: {client: {_type: 'reference', _ref: next}}} : {unset: ['client']}))
        }}
      >
        <option value="">Select a client…</option>
        {clients.map((option) => (
          <option key={option._id} value={option._id}>
            {option.name ?? 'Untitled client'}
          </option>
        ))}
      </Select>
    </Stack>
  )
}

function CampaignWorkspace({handle}: {handle: DocumentHandle}) {
  const {data: title} = useDocument<string>({...handle, path: 'title'})
  const {data: client} = useDocument<Reference>({...handle, path: 'client'})
  const {navigate} = useRouter()
  const create = useCreateAndOpen()
  const apply = useApplyDocumentActions()
  const toast = useToast()

  const remove = () => {
    if (!window.confirm('Delete this campaign? Posts keep their content but lose the campaign link.')) return
    apply(deleteDocument(handle))
      .then(() => navigate({name: 'campaigns'}))
      .catch((error: unknown) => toast.push({status: 'error', title: 'Delete failed', description: errorMessage(error)}))
  }

  return (
    <Page>
      <Card borderBottom paddingX={3} paddingY={2} style={{flex: 'none'}}>
        <Flex align="center" gap={2}>
          <Button mode="bleed" icon={ArrowLeftIcon} padding={2} fontSize={1} aria-label="Back to campaigns" onClick={() => navigate({name: 'campaigns'})} />
          <Text size={1} weight="semibold" textOverflow="ellipsis" style={{flex: 1}}>
            {title || 'Untitled campaign'}
          </Text>
          <Suspense fallback={null}>
            <DocumentStateChips documentId={handle.documentId} />
            <SaveButton documentId={handle.documentId} documentType="campaign" />
          </Suspense>
        </Flex>
      </Card>
      <Box flex={1} style={{overflow: 'auto', minHeight: 0}}>
        <Container width={1} paddingX={4} paddingY={5}>
          <Stack gap={5}>
            <StringField handle={handle} path="title" label="Title" />
            <Suspense fallback={<LoadingState />}>
              <CampaignClientField handle={handle} />
            </Suspense>
            <Flex gap={4} wrap="wrap">
              <Box flex={1} style={{minWidth: 180}}>
                <StringField handle={handle} path="startDate" label="Start date" type="date" />
              </Box>
              <Box flex={1} style={{minWidth: 180}}>
                <StringField handle={handle} path="endDate" label="End date" type="date" />
              </Box>
              <Box flex={1} style={{minWidth: 180}}>
                <SelectField
                  handle={handle}
                  path="status"
                  label="Status"
                  options={[
                    {value: 'planned', title: 'Planned'},
                    {value: 'active', title: 'Active'},
                    {value: 'completed', title: 'Completed'},
                    {value: 'archived', title: 'Archived'},
                  ]}
                />
              </Box>
            </Flex>
            <TextField handle={handle} path="description" label="Description" rows={3} />
            <TextField handle={handle} path="objective" label="Objective" rows={3} />
            <TextField handle={handle} path="targetAudience" label="Target audience" description="Narrows the client’s general audience for this campaign." rows={2} />
            <TagListField handle={handle} path="keyMessages" label="Key messages" description="What every post in this campaign should get across." placeholder="Add a message and press Enter" />
            <Flex justify="flex-end">
              <Button mode="bleed" tone="critical" icon={TrashIcon} text="Delete campaign" fontSize={1} padding={2} onClick={remove} />
            </Flex>
          </Stack>
        </Container>
        <Box paddingX={4} paddingBottom={5}>
          <Section
            title="Posts in this campaign"
            actions={
              <Button
                mode="bleed"
                icon={AddIcon}
                text="New post"
                fontSize={1}
                padding={1}
                onClick={() =>
                  void create('socialPost', {
                    campaign: {_type: 'reference', _ref: handle.documentId},
                    ...(client?._ref ? {client: {_type: 'reference', _ref: client._ref}} : {}),
                  })
                }
              />
            }
          >
            <Suspense fallback={<LoadingState />}>
              <PostTable
                options={{documentType: 'socialPost', filter: 'campaign._ref == $campaignId', params: {campaignId: handle.documentId}}}
                empty={<EmptyState title="No posts in this campaign yet" />}
              />
            </Suspense>
          </Section>
        </Box>
      </Box>
    </Page>
  )
}

export function CampaignPage({documentId}: {documentId: string}) {
  const handle: DocumentHandle = {documentId, documentType: 'campaign'}
  return (
    <Suspense fallback={<LoadingState label="Loading campaign…" fill />}>
      <CampaignWorkspace handle={handle} />
    </Suspense>
  )
}
