import {AddIcon} from '@sanity/icons/Add'
import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {Box, Button, Card, Container, Flex, Stack, Tab, TabList, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {useCreateDocument, useDocument, useQuery, type DocumentHandle} from '@sanity/sdk-react'
import {Suspense} from 'react'

import {InstagramConnection} from '../components/client/InstagramConnection'
import {PostTable} from '../components/ContentTable'
import {DocumentStateChips, SaveButton} from '../components/DocumentState'
import {ImageField, SelectField, StringField, TagListField, TextField} from '../components/fields'
import {Page, Section} from '../components/Layout'
import {Monogram} from '../components/shell/ClientSwitcher'
import {EmptyState, LoadingState} from '../components/States'
import {CampaignTable} from './CampaignsPage'
import {errorMessage} from '../lib/backend'
import {useRouter, type ClientTab} from '../lib/router'
import {useCreateAndOpen} from '../lib/useCreate'

const TABS: {id: ClientTab; label: string}[] = [
  {id: 'general', label: 'General'},
  {id: 'brand', label: 'Brand'},
  {id: 'social', label: 'Social accounts'},
  {id: 'campaigns', label: 'Campaigns'},
  {id: 'content', label: 'Content'},
]

function GeneralTab({handle}: {handle: DocumentHandle}) {
  return (
    <Stack gap={5}>
      <StringField handle={handle} path="name" label="Name" />
      <ImageField handle={handle} path="logo" label="Logo" />
      <Flex gap={4} wrap="wrap">
        <Box flex={1} style={{minWidth: 220}}>
          <StringField handle={handle} path="website" label="Website" type="url" placeholder="https://" />
        </Box>
        <Box flex={1} style={{minWidth: 220}}>
          <StringField handle={handle} path="industry" label="Industry" />
        </Box>
        <Box style={{width: 160}}>
          <StringField handle={handle} path="primaryLanguage" label="Primary language" placeholder="en-GB" />
        </Box>
      </Flex>
      <TextField handle={handle} path="description" label="Brand description" description="A short description of the business, in plain language." rows={5} />
      <Box style={{maxWidth: 240}}>
        <SelectField
          handle={handle}
          path="status"
          label="Status"
          options={[
            {value: 'active', title: 'Active'},
            {value: 'paused', title: 'Paused'},
            {value: 'archived', title: 'Archived'},
          ]}
        />
      </Box>
    </Stack>
  )
}

function BrandFields({guidelinesId}: {guidelinesId: string}) {
  const handle = {documentId: guidelinesId, documentType: 'brandGuidelines'}
  return (
    <Stack gap={5}>
      <Flex justify="flex-end" gap={2} align="center">
        <Suspense fallback={null}>
          <DocumentStateChips documentId={guidelinesId} />
          <SaveButton documentId={guidelinesId} documentType="brandGuidelines" />
        </Suspense>
      </Flex>
      <TextField handle={handle} path="brandVoice" label="Brand voice" description="How the brand sounds. Tone, personality, formality." rows={4} />
      <TextField handle={handle} path="targetAudience" label="Target audience" rows={3} />
      <TagListField handle={handle} path="contentPillars" label="Content pillars" />
      <Flex gap={4} wrap="wrap">
        <Box flex={1} style={{minWidth: 240}}>
          <TagListField handle={handle} path="wordsToUse" label="Words to use" />
        </Box>
        <Box flex={1} style={{minWidth: 240}}>
          <TagListField handle={handle} path="wordsToAvoid" label="Words to avoid" />
        </Box>
      </Flex>
      <TagListField handle={handle} path="ctaPreferences" label="CTA preferences" placeholder="e.g. Book a table" />
      <TagListField handle={handle} path="languages" label="Languages" description="BCP 47 codes, e.g. en-GB, fr-FR." placeholder="en-GB" />
      <TextField handle={handle} path="notes" label="Notes" description="Legal lines, spelling, emoji use: anything reviewers and AI drafts must respect." rows={3} />
      <Text size={1} muted>
        Each field is structured content: AI caption drafts read voice, audience, pillars and vocabulary from here.
      </Text>
    </Stack>
  )
}

function BrandTab({clientId}: {clientId: string}) {
  const {data: guidelinesId} = useQuery<string | null>({
    query: `*[_type == "brandGuidelines" && client._ref == $clientId][0]._id`,
    params: {clientId},
  })
  const createGuidelines = useCreateDocument<Record<string, unknown>>({documentType: 'brandGuidelines'})
  const toast = useToast()
  if (guidelinesId) return <BrandFields guidelinesId={guidelinesId.replace(/^drafts\./, '')} />
  return (
    <EmptyState
      title="No brand guidelines yet"
      description="Capture voice, audience, content pillars and vocabulary for this client."
      action={
        <Button
          icon={AddIcon}
          text="Create brand guidelines"
          mode="ghost"
          fontSize={1}
          padding={2}
          onClick={() =>
            void createGuidelines({client: {_type: 'reference', _ref: clientId}}).catch(
              (error: unknown) => toast.push({status: 'error', title: 'Could not create guidelines', description: errorMessage(error)}),
            )
          }
        />
      }
    />
  )
}

function ClientWorkspace({clientId, tab}: {clientId: string; tab: ClientTab}) {
  const handle: DocumentHandle = {documentId: clientId, documentType: 'client'}
  const {data: name} = useDocument<string>({...handle, path: 'name'})
  const {navigate} = useRouter()
  const create = useCreateAndOpen()

  return (
    <Page>
      <Card borderBottom paddingX={3} paddingTop={2} style={{flex: 'none'}}>
        <Stack gap={2}>
          <Flex align="center" gap={2}>
            <Button mode="bleed" icon={ArrowLeftIcon} padding={2} fontSize={1} aria-label="Back to clients" onClick={() => navigate({name: 'clients'})} />
            <Monogram name={name ?? null} size={22} />
            <Text size={1} weight="semibold" textOverflow="ellipsis" style={{flex: 1}}>
              {name || 'Untitled client'}
            </Text>
            <Suspense fallback={null}>
              <DocumentStateChips documentId={clientId} />
              <SaveButton documentId={clientId} documentType="client" />
            </Suspense>
          </Flex>
          <TabList gap={1}>
            {TABS.map((entry) => (
              <Tab
                key={entry.id}
                id={`client-tab-${entry.id}`}
                aria-controls="client-panel"
                label={entry.label}
                fontSize={1}
                padding={2}
                selected={tab === entry.id}
                onClick={() => navigate({name: 'client', id: clientId, tab: entry.id})}
              />
            ))}
          </TabList>
        </Stack>
      </Card>
      <Box id="client-panel" flex={1} style={{overflow: 'auto', minHeight: 0}}>
        {(tab === 'general' || tab === 'brand' || tab === 'social') && (
          <Container width={1} paddingX={4} paddingY={5}>
            <Suspense fallback={<LoadingState />}>
              {tab === 'general' && <GeneralTab handle={handle} />}
              {tab === 'brand' && <BrandTab clientId={clientId} />}
              {tab === 'social' && (
                <Stack gap={4}>
                  <Section title="Instagram">
                    <Box padding={3}>
                      <InstagramConnection clientId={clientId} />
                    </Box>
                  </Section>
                  <Text size={1} muted>
                    More networks will be added later.
                  </Text>
                </Stack>
              )}
            </Suspense>
          </Container>
        )}
        {tab === 'campaigns' && (
          <Stack>
            <Flex justify="flex-end" padding={3}>
              <Button icon={AddIcon} text="New campaign" mode="ghost" fontSize={1} padding={2} onClick={() => void create('campaign', {client: {_type: 'reference', _ref: clientId}})} />
            </Flex>
            <Suspense fallback={<LoadingState />}>
              <CampaignTable filter="client._ref == $clientId" params={{clientId}} />
            </Suspense>
          </Stack>
        )}
        {tab === 'content' && (
          <Stack>
            <Flex justify="flex-end" padding={3}>
              <Button icon={AddIcon} text="New post" mode="ghost" fontSize={1} padding={2} onClick={() => void create('socialPost', {client: {_type: 'reference', _ref: clientId}})} />
            </Flex>
            <Suspense fallback={<LoadingState />}>
              <PostTable
                options={{documentType: 'socialPost', filter: 'client._ref == $clientId', params: {clientId}}}
                empty={<EmptyState title="No posts for this client yet" />}
              />
            </Suspense>
          </Stack>
        )}
      </Box>
    </Page>
  )
}

export function ClientPage({documentId, tab}: {documentId: string; tab: ClientTab}) {
  return (
    <Suspense fallback={<LoadingState label="Loading client…" fill />}>
      <ClientWorkspace clientId={documentId} tab={tab} />
    </Suspense>
  )
}
