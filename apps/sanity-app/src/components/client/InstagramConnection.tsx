import {LinkIcon} from '@sanity/icons/Link'
import {UnlinkIcon} from '@sanity/icons/Unlink'
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {useDocument} from '@sanity/sdk-react'
import type {
  DisconnectInstagramResponse,
  InstagramConnectionSummary,
  StartInstagramConnectResponse,
} from '@social-studio/shared'
import {useState} from 'react'

import {errorMessage, isBackendConfigured, useBackend} from '../../lib/backend'
import {formatDate, formatDateTime} from '../../lib/dates'
import {useIntegrationStatus} from '../../lib/useIntegrationStatus'
import {useDocumentState} from '../DocumentState'
import {InstagramGlyph} from '../InstagramGlyph'
import {Notice} from '../States'
import {ToneLabel} from '../StatusBadge'

const ACCOUNT_TYPE_LABELS: Record<InstagramConnectionSummary['accountType'], string> = {
  BUSINESS: 'Professional account · Business',
  MEDIA_CREATOR: 'Professional account · Creator',
}

/**
 * Instagram connection for one client. The connection summary is mirrored onto the client
 * document by the backend; tokens stay in Supabase and never reach the browser.
 */
export function InstagramConnection({clientId}: {clientId: string}) {
  const handle = {documentId: clientId, documentType: 'client'}
  const {data: connection} = useDocument<Partial<InstagramConnectionSummary>>({...handle, path: 'instagram'})
  const state = useDocumentState(clientId)
  const integration = useIntegrationStatus()
  const request = useBackend()
  const toast = useToast()
  const [busy, setBusy] = useState<'connect' | 'disconnect' | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  const connected = connection?.status === 'connected'
  const needsReconnect = connection?.status === 'expired' || connection?.status === 'revoked'

  const connect = async () => {
    setBusy('connect')
    setPendingUrl(null)
    try {
      const response = await request<StartInstagramConnectResponse>('/api/auth/instagram/start', {
        method: 'POST',
        body: {clientId},
      })
      // The OAuth flow runs in its own window; the backend updates this client when it completes.
      const opened = window.open(response.authorizeUrl, 'instagram-connect', 'popup,width=560,height=720')
      if (!opened) setPendingUrl(response.authorizeUrl)
    } catch (error) {
      toast.push({status: 'error', title: 'Could not start Instagram connection', description: errorMessage(error)})
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect this Instagram account? Scheduled posts for this client will fail until it is reconnected.')) return
    setBusy('disconnect')
    try {
      await request<DisconnectInstagramResponse>(`/api/clients/${encodeURIComponent(clientId)}/instagram/disconnect`, {method: 'POST'})
    } catch (error) {
      toast.push({status: 'error', title: 'Could not disconnect', description: errorMessage(error)})
    } finally {
      setBusy(null)
    }
  }

  const blocker = !isBackendConfigured
    ? 'Backend URL not configured. Set SANITY_APP_WEB_URL to the apps/web URL.'
    : !state.published
      ? 'Save this client before connecting accounts.'
      : integration.status === 'ready' && integration.data.instagramMode === 'unconfigured'
        ? 'Instagram API credentials not configured.'
        : null

  return (
    <Stack gap={3}>
      {integration.status === 'error' && isBackendConfigured && (
        <Notice tone="critical" title="Backend unavailable">
          {integration.error}
        </Notice>
      )}
      {integration.status === 'ready' && integration.data.instagramMode === 'mock' && (
        <Notice title="Development mode">
          The backend uses a mock Instagram client. Connections and publishes are simulated and clearly marked; nothing reaches Instagram.
        </Notice>
      )}

      <Card border radius={2} padding={3}>
        <Flex gap={3} align="center" wrap="wrap">
          <Card border radius={2} tone="transparent" style={{width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>
            <Text size={2}>
              <InstagramGlyph />
            </Text>
          </Card>
          <Stack gap={2} flex={1} style={{minWidth: 200}}>
            <Flex gap={2} align="center">
              <Text size={1} weight="medium">
                {connection?.username ? `@${connection.username}` : 'Instagram'}
              </Text>
              {connection?.mode === 'mock' && (
                <Text size={0} muted>
                  Mock
                </Text>
              )}
            </Flex>
            {connected ? (
              <Flex gap={3} align="center" wrap="wrap">
                <ToneLabel tone="positive" label="Connected" />
                {connection?.accountType && (
                  <Text size={1} muted>
                    {ACCOUNT_TYPE_LABELS[connection.accountType]}
                  </Text>
                )}
              </Flex>
            ) : needsReconnect ? (
              <ToneLabel tone="critical" label={connection?.status === 'expired' ? 'Access expired' : 'Access revoked'} />
            ) : (
              <ToneLabel tone="default" label="Not connected" />
            )}
          </Stack>
          <Box>
            {connected ? (
              <Button mode="ghost" tone="critical" icon={UnlinkIcon} text="Disconnect" fontSize={1} padding={2} loading={busy === 'disconnect'} disabled={!isBackendConfigured} onClick={() => void disconnect()} />
            ) : (
              <Button
                tone="primary"
                icon={LinkIcon}
                text={needsReconnect ? 'Reconnect Instagram' : 'Connect Instagram'}
                fontSize={1}
                padding={2}
                loading={busy === 'connect'}
                disabled={Boolean(blocker)}
                onClick={() => void connect()}
              />
            )}
          </Box>
        </Flex>
        {connected && (connection?.connectedAt || connection?.tokenExpiresAt) && (
          <Box paddingTop={3}>
            <Text size={1} muted>
              {connection.connectedAt ? `Connected ${formatDateTime(connection.connectedAt)}` : ''}
              {connection.tokenExpiresAt ? ` · Access renews automatically before ${formatDate(connection.tokenExpiresAt)}` : ''}
            </Text>
          </Box>
        )}
      </Card>

      {blocker && !connected && (
        <Text size={1} muted>
          {blocker}
        </Text>
      )}
      {pendingUrl && (
        <Notice tone="primary" title="Allow the popup, or continue in a new tab">
          <a href={pendingUrl} target="_blank" rel="noreferrer">
            Open Instagram authorization
          </a>
        </Notice>
      )}
      <Text size={1} muted>
        Only Instagram professional accounts (Business or Creator) can publish through the API. You sign in with Instagram; Social Studio never sees or stores your password.
      </Text>
    </Stack>
  )
}
