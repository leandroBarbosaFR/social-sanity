import {LaunchIcon} from '@sanity/icons/Launch'
import {PublishIcon} from '@sanity/icons/Publish'
import {Button, Card, Checkbox, Dialog, Flex, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {Tooltip} from '@sanity/ui/tooltip'
import {
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {
  canTransition,
  CONFIRMABLE_PUBLISH_STATUSES,
  DIRECT_PUBLISH_STATUSES,
  WORKFLOW_STATUS_LABELS,
  type PublishNowRequest,
  type PublishNowResponse,
  type ValidationIssue,
  type WorkflowStatus,
} from '@social-studio/shared'
import {useState, type ReactNode} from 'react'

import {BackendError, errorMessage, isBackendConfigured, useBackend} from '../../lib/backend'
import type {PostDocument} from '../../lib/types'
import {useDocumentState} from '../DocumentState'
import {ReviewWorkflow} from './review'

interface TransitionSpec {
  to: WorkflowStatus
  label: string
  primary?: boolean
}

/**
 * Scheduling transitions. Review and approval (idea → approved, and back to draft) run through the
 * post's Sanity Workflows instance instead; see ./review.tsx.
 */
function transitionsFor(status: WorkflowStatus): TransitionSpec[] {
  switch (status) {
    case 'approved':
      return [{to: 'scheduled', label: 'Schedule', primary: true}]
    case 'scheduled':
      return [{to: 'approved', label: 'Unschedule', primary: true}]
    case 'failed':
      return [{to: 'scheduled', label: 'Reschedule', primary: true}]
    default:
      return []
  }
}

function PublishDialog({
  doc,
  issues,
  hasDraft,
  onClose,
}: {
  doc: PostDocument
  issues: ValidationIssue[]
  hasDraft: boolean
  onClose: () => void
}) {
  const status = doc.workflowStatus ?? 'idea'
  const needsConfirmation = CONFIRMABLE_PUBLISH_STATUSES.includes(status)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{tone: 'positive' | 'critical' | 'caution'; message: string} | null>(null)
  const request = useBackend()
  const apply = useApplyDocumentActions()
  const handle: DocumentHandle = {documentId: doc._id.replace(/^drafts\./, ''), documentType: 'socialPost'}
  const blocked = issues.length > 0 || (needsConfirmation && !confirmed)

  const publish = async () => {
    setBusy(true)
    setResult(null)
    try {
      // The backend publishes the saved version, so save pending edits first.
      if (hasDraft) await apply(publishDocument(handle))
      const body: PublishNowRequest = needsConfirmation ? {confirmUnapproved: true} : {}
      const response = await request<PublishNowResponse>(`/api/posts/${encodeURIComponent(handle.documentId)}/publish`, {
        method: 'POST',
        body,
      })
      switch (response.outcome) {
        case 'published':
          setResult({
            tone: response.mode === 'mock' ? 'caution' : 'positive',
            message:
              response.mode === 'mock'
                ? 'Mock publish completed. Nothing was posted to Instagram (development mode).'
                : 'Published to Instagram.',
          })
          break
        case 'failed':
          setResult({tone: 'critical', message: response.message})
          break
        case 'already_published':
          setResult({tone: 'caution', message: 'This post was already published.'})
          break
        case 'in_progress':
          setResult({tone: 'caution', message: 'A publishing run is already in progress for this post.'})
          break
      }
    } catch (error) {
      setResult({
        tone: 'critical',
        message: error instanceof BackendError && error.code === 'meta_not_configured' ? 'Instagram API credentials not configured.' : errorMessage(error),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      id="publish-dialog"
      header={status === 'failed' ? 'Retry publishing' : 'Publish now'}
      width={1}
      onClose={busy ? undefined : onClose}
      footer={
        <Flex justify="flex-end" gap={2} padding={3}>
          <Button mode="bleed" text={result ? 'Close' : 'Cancel'} fontSize={1} padding={2} disabled={busy} onClick={onClose} />
          {!result && (
            <Button
              tone="primary"
              icon={PublishIcon}
              text={status === 'failed' ? 'Retry now' : 'Publish now'}
              fontSize={1}
              padding={2}
              loading={busy}
              disabled={blocked}
              onClick={() => void publish()}
            />
          )}
        </Flex>
      }
    >
      <Stack gap={4} padding={4}>
        <Text size={1} muted>
          The post is published to Instagram immediately{hasDraft ? ', after saving your latest changes' : ''}.
        </Text>
        {issues.length > 0 && (
          <Card tone="critical" border radius={2} padding={3}>
            <Stack gap={2}>
              <Text size={1} weight="medium">
                Fix these before publishing
              </Text>
              {issues.map((issue) => (
                <Text key={issue.field + issue.message} size={1} muted>
                  {issue.message}
                </Text>
              ))}
            </Stack>
          </Card>
        )}
        {needsConfirmation && (
          <Card tone="caution" border radius={2} padding={3}>
            <Flex gap={3} align="flex-start">
              <Checkbox id="confirm-unapproved" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} />
              <Text as="label" htmlFor="confirm-unapproved" size={1}>
                This post is <strong>{WORKFLOW_STATUS_LABELS[status].toLowerCase()}</strong> and has not been approved. Publish it anyway.
              </Text>
            </Flex>
          </Card>
        )}
        {result && (
          <Card tone={result.tone} border radius={2} padding={3}>
            <Text size={1}>{result.message}</Text>
          </Card>
        )}
      </Stack>
    </Dialog>
  )
}

function DisabledWithReason({reason, children}: {reason: string | null; children: ReactNode}) {
  if (!reason) return <>{children}</>
  return (
    <Tooltip portal padding={2} content={<Text size={1}>{reason}</Text>}>
      <span>{children}</span>
    </Tooltip>
  )
}

export function EditorActions({
  doc,
  publishIssues,
  scheduleIssues,
  publishDialogOpen,
  setPublishDialogOpen,
}: {
  doc: PostDocument
  publishIssues: ValidationIssue[]
  scheduleIssues: ValidationIssue[]
  /** Owned by the editor so the publishing panel's Retry button can open the same dialog. */
  publishDialogOpen: boolean
  setPublishDialogOpen: (open: boolean) => void
}) {
  const documentId = doc._id.replace(/^drafts\./, '')
  const handle: DocumentHandle = {documentId, documentType: 'socialPost'}
  const state = useDocumentState(documentId)
  const apply = useApplyDocumentActions()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const status = doc.workflowStatus ?? 'idea'
  const hasDraft = Boolean(state.draft)

  const run = async (label: string, work: () => Promise<unknown>) => {
    setBusy(label)
    try {
      await work()
    } catch (error) {
      toast.push({status: 'error', title: `${label} failed`, description: errorMessage(error)})
    } finally {
      setBusy(null)
    }
  }

  const transition = (spec: TransitionSpec) => {
    if (!canTransition(status, spec.to)) return
    const set: Record<string, unknown> = {workflowStatus: spec.to}
    const unset = spec.to === 'scheduled' ? ['publishingError'] : []
    void run(spec.label, () => apply([editDocument(handle, {set, unset}), publishDocument(handle)]))
  }

  const primary = transitionsFor(status).filter((spec) => spec.primary)
  const reasonFor = (spec: TransitionSpec): string | null => {
    if (spec.to === 'scheduled' && scheduleIssues.length > 0) return scheduleIssues.map((issue) => issue.message).join(' ')
    return null
  }

  const canPublishNow = DIRECT_PUBLISH_STATUSES.includes(status) || CONFIRMABLE_PUBLISH_STATUSES.includes(status)
  const publishReason = !isBackendConfigured
    ? 'Backend URL not configured (SANITY_APP_WEB_URL).'
    : status === 'idea'
      ? 'Start a draft before publishing.'
      : null

  return (
    <Flex gap={2} align="center" wrap="wrap">
      {status === 'published' && doc.instagramPermalink && (
        <Button as="a" href={doc.instagramPermalink} target="_blank" rel="noreferrer" mode="ghost" icon={LaunchIcon} text="View on Instagram" fontSize={1} padding={2} />
      )}
      {status === 'publishing' && <Button text="Publishing…" fontSize={1} padding={2} mode="ghost" disabled loading />}

      {status !== 'publishing' && status !== 'published' && (
        <Button
          mode="ghost"
          text={hasDraft ? 'Save' : 'Saved'}
          fontSize={1}
          padding={2}
          disabled={!hasDraft || busy !== null}
          loading={busy === 'Save'}
          onClick={() => void run('Save', () => apply(publishDocument(handle)))}
        />
      )}

      <ReviewWorkflow doc={doc} disabled={busy !== null} />

      {primary.map((spec) => {
        const reason = reasonFor(spec)
        return (
          <DisabledWithReason key={spec.to} reason={reason}>
            <Button
              tone="primary"
              mode={spec.to === 'approved' ? 'ghost' : 'default'}
              text={spec.label}
              fontSize={1}
              padding={2}
              disabled={Boolean(reason) || busy !== null}
              loading={busy === spec.label}
              onClick={() => transition(spec)}
            />
          </DisabledWithReason>
        )
      })}

      {canPublishNow && (
        <DisabledWithReason reason={publishReason}>
          <Button
            tone={status === 'failed' ? 'critical' : 'default'}
            mode={status === 'failed' || status === 'approved' || status === 'scheduled' ? 'default' : 'ghost'}
            icon={PublishIcon}
            text={status === 'failed' ? 'Retry' : 'Publish now'}
            fontSize={1}
            padding={2}
            disabled={Boolean(publishReason) || busy !== null}
            onClick={() => setPublishDialogOpen(true)}
          />
        </DisabledWithReason>
      )}

      {publishDialogOpen && (
        <PublishDialog doc={doc} issues={publishIssues} hasDraft={hasDraft} onClose={() => setPublishDialogOpen(false)} />
      )}
    </Flex>
  )
}
