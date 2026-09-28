import {MoonIcon} from '@sanity/icons/Moon'
import {SunIcon} from '@sanity/icons/Sun'
import {Box, Button, Card, Container, Flex, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {useCreateDocument, useQuery} from '@sanity/sdk-react'
import {Suspense, type ReactNode} from 'react'

import {DocumentStateChips, SaveButton} from '../components/DocumentState'
import {StringField} from '../components/fields'
import {Page, PageHeader, Section} from '../components/Layout'
import {LoadingState} from '../components/States'
import {ToneLabel} from '../components/StatusBadge'
import {appConfig} from '../config'
import {errorMessage} from '../lib/backend'
import {useIntegrationStatus} from '../lib/useIntegrationStatus'
import {useColorScheme} from '../SanityUI'

function Row({label, children}: {label: string; children: ReactNode}) {
  return (
    <Flex align="center" gap={3} paddingX={3} paddingY={2}>
      <Box style={{width: 200, flex: 'none'}}>
        <Text size={1} muted>
          {label}
        </Text>
      </Box>
      <Box flex={1} style={{minWidth: 0}}>
        {children}
      </Box>
    </Flex>
  )
}

function Configured({ok, okLabel = 'Configured', missing = 'Not configured'}: {ok: boolean; okLabel?: string; missing?: string}) {
  return <ToneLabel tone={ok ? 'positive' : 'caution'} label={ok ? okLabel : missing} />
}

function Integrations() {
  const integration = useIntegrationStatus()
  return (
    <Section title="Integrations">
      <Stack>
        <Row label="Sanity project">
          <Text size={1}>
            {appConfig.projectId} · {appConfig.dataset}
          </Text>
        </Row>
        <Row label="Backend (apps/web)">
          {appConfig.webUrl ? <Text size={1}>{appConfig.webUrl}</Text> : <Configured ok={false} missing="SANITY_APP_WEB_URL not set" />}
        </Row>
        {integration.status === 'loading' && (
          <Row label="Server integrations">
            <Text size={1} muted>
              Checking…
            </Text>
          </Row>
        )}
        {integration.status === 'error' && (
          <Row label="Server integrations">
            <ToneLabel tone="critical" label={integration.error} />
          </Row>
        )}
        {integration.status === 'ready' && (
          <>
            <Row label="Sanity write token">
              <Configured ok={integration.data.sanity} />
            </Row>
            <Row label="Supabase">
              <Configured ok={integration.data.supabase} />
            </Row>
            <Row label="Token encryption key">
              <Configured ok={integration.data.encryption} />
            </Row>
            <Row label="Meta app credentials">
              <Configured ok={integration.data.meta} missing="Instagram API credentials not configured" />
            </Row>
            <Row label="Instagram publishing">
              <ToneLabel
                tone={integration.data.instagramMode === 'live' ? 'positive' : 'caution'}
                label={
                  integration.data.instagramMode === 'live'
                    ? 'Live'
                    : integration.data.instagramMode === 'mock'
                      ? 'Mock (development only)'
                      : 'Unavailable'
                }
              />
            </Row>
          </>
        )}
      </Stack>
    </Section>
  )
}

function OrganizationSettings() {
  const {data: organizationId} = useQuery<string | null>({query: `*[_type == "organization"] | order(_createdAt asc)[0]._id`})
  const create = useCreateDocument<Record<string, unknown>>({documentType: 'organization'})
  const toast = useToast()

  if (!organizationId) {
    return (
      <Section title="Organization">
        <Flex padding={3} align="center" gap={3}>
          <Text size={1} muted style={{flex: 1}}>
            No organization document exists in this dataset yet.
          </Text>
          <Button
            mode="ghost"
            text="Create organization"
            fontSize={1}
            padding={2}
            onClick={() =>
              void create({name: 'My agency', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone}).catch((error: unknown) =>
                toast.push({status: 'error', title: 'Could not create organization', description: errorMessage(error)}),
              )
            }
          />
        </Flex>
      </Section>
    )
  }

  const id = organizationId.replace(/^drafts\./, '')
  const handle = {documentId: id, documentType: 'organization'}
  return (
    <Section
      title="Organization"
      actions={
        <Suspense fallback={null}>
          <Flex gap={2} align="center">
            <DocumentStateChips documentId={id} />
            <SaveButton documentId={id} documentType="organization" />
          </Flex>
        </Suspense>
      }
    >
      <Stack gap={4} padding={3}>
        <StringField handle={handle} path="name" label="Name" />
        <StringField handle={handle} path="website" label="Website" type="url" />
        <StringField handle={handle} path="timezone" label="Time zone" description="IANA name, e.g. Europe/London." />
      </Stack>
    </Section>
  )
}

export function SettingsPage() {
  const {scheme, setScheme} = useColorScheme()
  return (
    <Page>
      <PageHeader title="Settings" />
      <Box flex={1} style={{overflow: 'auto', minHeight: 0}}>
        <Container width={1} paddingX={4} paddingY={5}>
          <Stack gap={4}>
            <Section title="Appearance">
              <Flex padding={3} align="center" gap={3}>
                <Text size={1} muted style={{flex: 1}}>
                  Color scheme for this browser
                </Text>
                <Card border radius={2} padding={1}>
                  <Flex gap={1}>
                    <Button mode="bleed" selected={scheme === 'dark'} icon={MoonIcon} text="Dark" fontSize={1} padding={2} onClick={() => setScheme('dark')} />
                    <Button mode="bleed" selected={scheme === 'light'} icon={SunIcon} text="Light" fontSize={1} padding={2} onClick={() => setScheme('light')} />
                  </Flex>
                </Card>
              </Flex>
            </Section>
            <Suspense fallback={<LoadingState />}>
              <OrganizationSettings />
            </Suspense>
            <Integrations />
          </Stack>
        </Container>
      </Box>
    </Page>
  )
}
