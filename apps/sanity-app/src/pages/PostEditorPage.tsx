import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {TrashIcon} from '@sanity/icons/Trash'
import {Box, Button, Card, Container, Flex, Stack, Text, useMediaIndex} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {
  deleteDocument,
  useApplyDocumentActions,
  useDocument,
  useDocumentProjection,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {
  isLockedStatus,
  validatePostForPublishing,
  type ValidationIssue,
} from '@social-studio/shared'
import {Suspense, useEffect, useMemo, useState} from 'react'

import {Page} from '../components/Layout'
import {
  CaptionField,
  ClientCampaignFields,
  FormatField,
  HashtagsField,
  ScheduleField,
  TitleField,
} from '../components/post/fields'
import {CaptionAssist} from '../components/post/CaptionAssist'
import {InstagramPreview, type PreviewProps} from '../components/post/InstagramPreview'
import {CoverImageField, MediaField} from '../components/post/MediaField'
import {PublishingPanel} from '../components/post/PublishingPanel'
import {DocumentStateChips, useDocumentState} from '../components/DocumentState'
import {EditorActions} from '../components/post/workflow'
import {EmptyState, LoadingState, Notice} from '../components/States'
import {StatusBadge} from '../components/StatusBadge'
import {assetUrl, resolveMedia} from '../lib/assets'
import {errorMessage} from '../lib/backend'
import {useRouter} from '../lib/router'
import type {PostDocument} from '../lib/types'

interface ClientIdentity {
  name: string | null
  logoUrl: string | null
  instagram: {username: string | null; status: string | null; mode: string | null} | null
}

const CLIENT_IDENTITY = `{name, "logoUrl": logo.asset->url, instagram{username, status, mode}}`

function PreviewWithClient({clientId, preview}: {clientId: string; preview: Omit<PreviewProps, 'username' | 'avatarUrl'>}) {
  const {data} = useDocumentProjection<ClientIdentity>({documentId: clientId, documentType: 'client', projection: CLIENT_IDENTITY})
  const username = data?.instagram?.username ?? data?.name?.toLowerCase().replace(/[^a-z0-9_.]+/g, '') ?? null
  return <InstagramPreview {...preview} username={username} avatarUrl={data?.logoUrl ?? null} />
}

/** Checks the client's Instagram connection; scheduling is blocked without one. */
function ConnectionCheck({clientId, onIssue}: {clientId: string; onIssue: (issue: ValidationIssue | null) => void}) {
  const {data} = useDocumentProjection<ClientIdentity>({documentId: clientId, documentType: 'client', projection: CLIENT_IDENTITY})
  const status = data?.instagram?.status
  const issue: ValidationIssue | null =
    status === 'connected'
      ? null
      : {
          field: 'client',
          message: status
            ? `${data?.name ?? 'This client'}’s Instagram connection is ${status}. Reconnect it first.`
            : `Connect an Instagram account for ${data?.name ?? 'this client'} first.`,
        }
  const message = issue?.message ?? null
  useEffect(() => {
    onIssue(message ? {field: 'client', message} : null)
    return () => onIssue(null)
  }, [message, onIssue])
  return null
}

/** Scheduling reads the saved version; unsaved draft edits would silently be left out. */
function UnsavedScheduleWarning({documentId}: {documentId: string}) {
  const state = useDocumentState(documentId)
  if (!state.draft) return null
  return (
    <Notice title="Unsaved changes will not be published">
      This post is scheduled. The saved version is what gets published; Save to include your latest edits.
    </Notice>
  )
}

function EditorWorkspace({handle}: {handle: DocumentHandle}) {
  const {data: doc} = useDocument<PostDocument>(handle)
  const {navigate} = useRouter()
  const apply = useApplyDocumentActions()
  const toast = useToast()
  const stacked = useMediaIndex() < 3
  const [connectionIssue, setConnectionIssue] = useState<ValidationIssue | null>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)

  const media = useMemo(() => resolveMedia(doc?.media), [doc?.media])

  if (!doc) {
    return (
      <EmptyState
        title="Post not found"
        description="It may have been deleted."
        action={<Button mode="ghost" text="Back to content" fontSize={1} padding={2} onClick={() => navigate({name: 'content'})} />}
      />
    )
  }

  const status = doc.workflowStatus ?? 'idea'
  const locked = isLockedStatus(status)
  const validationInput = {
    title: doc.title,
    clientId: doc.client?._ref,
    platforms: doc.platforms,
    format: doc.format,
    caption: doc.caption,
    hashtags: doc.hashtags,
    media,
    scheduledAt: doc.scheduledAt,
    workflowStatus: status,
  }
  const contentIssues = validatePostForPublishing(validationInput)
  const publishIssues = connectionIssue ? [...contentIssues, connectionIssue] : contentIssues
  const scheduleIssues = [
    ...validatePostForPublishing(validationInput, {requireSchedule: true}),
    ...(connectionIssue ? [connectionIssue] : []),
  ]
  const showReadiness = ['draft', 'internalReview', 'clientReview', 'approved'].includes(status)

  const remove = () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    apply(deleteDocument(handle))
      .then(() => navigate({name: 'content'}))
      .catch((error: unknown) => toast.push({status: 'error', title: 'Delete failed', description: errorMessage(error)}))
  }

  const preview = {
    format: doc.format,
    media,
    caption: doc.caption,
    hashtags: doc.hashtags,
    coverUrl: assetUrl(doc.coverImage?.asset?._ref),
  }

  const form = (
    <Container width={1} paddingX={4} paddingY={5}>
      <Stack gap={5}>
        <PublishingPanel doc={doc} onRetry={() => setPublishDialogOpen(true)} />

        {(status === 'scheduled' || status === 'approved') && (
          <Suspense fallback={null}>
            <UnsavedScheduleWarning documentId={handle.documentId} />
          </Suspense>
        )}

        {locked && status === 'published' && (
          <Notice tone="default" title="This post is live">
            Published posts are read-only. Instagram does not allow editing media after publishing.
          </Notice>
        )}

        <TitleField handle={handle} readOnly={locked} />
        <ClientCampaignFields handle={handle} readOnly={locked} />
        <FormatField handle={handle} readOnly={locked} />
        <MediaField handle={handle} format={doc.format} readOnly={locked} />
        {doc.format === 'reel' && <CoverImageField handle={handle} readOnly={locked} />}
        <CaptionField handle={handle} format={doc.format} readOnly={locked} />
        {!locked && <CaptionAssist handle={handle} />}
        <HashtagsField handle={handle} readOnly={locked} />
        <ScheduleField handle={handle} readOnly={locked || status === 'scheduled'} />
        {status === 'scheduled' && (
          <Text size={1} muted>
            Unschedule the post to change its time, or drag it in the calendar.
          </Text>
        )}

        {showReadiness && (
          <Card border radius={2} padding={3} tone={scheduleIssues.length ? 'transparent' : 'positive'}>
            <Stack gap={3}>
              <Text size={1} weight="medium">
                {scheduleIssues.length ? 'Before this can be scheduled' : 'Ready to schedule'}
              </Text>
              {scheduleIssues.map((issue) => (
                <Text key={issue.field + issue.message} size={1} muted>
                  {issue.message}
                </Text>
              ))}
            </Stack>
          </Card>
        )}

        <Flex gap={2} align="center">
          <Text size={1} muted style={{flex: 1}}>
            {doc.createdBy?.name ? `Created by ${doc.createdBy.name}` : ''}
            {doc.approvedBy?.name ? ` · Approved by ${doc.approvedBy.name}` : ''}
          </Text>
          {!locked && <Button mode="bleed" tone="critical" icon={TrashIcon} text="Delete" fontSize={1} padding={2} onClick={remove} />}
        </Flex>
      </Stack>
    </Container>
  )

  const previewPane = (
    <Stack gap={4}>
      {doc.client?._ref ? (
        <Suspense fallback={<LoadingState label="Loading preview…" />}>
          <PreviewWithClient clientId={doc.client._ref} preview={preview} />
        </Suspense>
      ) : (
        <InstagramPreview {...preview} username={null} avatarUrl={null} />
      )}
    </Stack>
  )

  return (
    <Page>
      <Card borderBottom paddingX={3} paddingY={2} style={{flex: 'none'}}>
        <Flex align="center" gap={3} wrap="wrap">
          <Button mode="bleed" icon={ArrowLeftIcon} padding={2} fontSize={1} aria-label="Back to content" onClick={() => navigate({name: 'content'})} />
          <Stack gap={2} flex={1} style={{minWidth: 160}}>
            <Text size={1} weight="semibold" textOverflow="ellipsis">
              {doc.title || 'Untitled post'}
            </Text>
          </Stack>
          <StatusBadge status={status} />
          <Suspense fallback={null}>
            <DocumentStateChips documentId={handle.documentId} />
          </Suspense>
          <Suspense fallback={null}>
            <EditorActions
              doc={doc}
              publishIssues={publishIssues}
              scheduleIssues={scheduleIssues}
              publishDialogOpen={publishDialogOpen}
              setPublishDialogOpen={setPublishDialogOpen}
            />
          </Suspense>
        </Flex>
      </Card>
      {doc.client?._ref && (
        <Suspense fallback={null}>
          <ConnectionCheck clientId={doc.client._ref} onIssue={setConnectionIssue} />
        </Suspense>
      )}
      {stacked ? (
        <Box flex={1} style={{overflow: 'auto', minHeight: 0}}>
          {form}
          <Box paddingX={4} paddingBottom={5}>
            {previewPane}
          </Box>
        </Box>
      ) : (
        <Flex flex={1} style={{minHeight: 0}}>
          <Box flex={1} style={{overflow: 'auto', minWidth: 0}}>
            {form}
          </Box>
          <Card borderLeft padding={4} style={{width: 400, flex: 'none', overflow: 'auto'}}>
            {previewPane}
          </Card>
        </Flex>
      )}
    </Page>
  )
}

export function PostEditorPage({documentId}: {documentId: string}) {
  const handle = useMemo<DocumentHandle>(() => ({documentId, documentType: 'socialPost'}), [documentId])
  return (
    <Suspense fallback={<LoadingState label="Loading post…" fill />}>
      <EditorWorkspace handle={handle} />
    </Suspense>
  )
}
