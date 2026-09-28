import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'
import {Badge, Button, Dialog, Flex, Stack, Text, TextArea} from '@sanity/ui'
import {Menu, MenuButton, MenuItem} from '@sanity/ui/menu'
import {useToast} from '@sanity/ui/toast'
import {Tooltip} from '@sanity/ui/tooltip'
import {
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  useCurrentUser,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {actionRendering, errorMessage as workflowErrorMessage} from '@sanity/workflow-engine'
import {useWorkflowSession} from '@sanity/workflow-sdk'
import {isLockedStatus, type WorkflowStatus} from '@social-studio/shared'
import {statusForStage} from '@social-studio/workflows'
import {useEffect, useRef, useState} from 'react'

import {errorMessage} from '../../lib/backend'
import type {PostDocument} from '../../lib/types'
import {useEngine, usePostReview, useStartPostReview} from '../../lib/workflow'

/** Actions shown as buttons; everything else goes in the overflow menu. */
const PRIMARY_ACTIONS = new Set(['start-draft', 'submit', 'send-to-client', 'approve'])
/** Actions that ask for a reason before firing. */
const REASON_ACTIONS = new Set(['request-changes'])

interface ReviewAction {
  activity: string
  name: string
  title: string
  allowed: boolean
}

function Unavailable({message}: {message: string}) {
  return (
    <Tooltip portal padding={2} content={<Text size={1}>{message}</Text>}>
      <span>
        <Button mode="bleed" tone="caution" icon={WarningOutlineIcon} text="Review unavailable" fontSize={1} padding={2} disabled />
      </span>
    </Tooltip>
  )
}

/** Mirrors the post's workflowStatus onto the stage the workflow landed in, and saves the post. */
function useMirrorStatus(doc: PostDocument) {
  const apply = useApplyDocumentActions()
  const user = useCurrentUser()
  const handle: DocumentHandle = {documentId: doc._id.replace(/^drafts\./, ''), documentType: 'socialPost'}
  return async (stage: string) => {
    const current = doc.workflowStatus ?? 'idea'
    const target = statusForStage(stage, current)
    if (!target || target === current) return
    const set: Record<string, unknown> = {workflowStatus: target}
    const unset: string[] = []
    if (target === 'approved') {
      set.approvedAt = new Date().toISOString()
      if (user) set.approvedBy = {_type: 'userStamp', sanityUserId: user.id, name: user.name}
    }
    if (target === 'draft' || target === 'idea') unset.push('approvedAt', 'approvedBy')
    await apply([editDocument(handle, {set, unset}), publishDocument(handle)])
  }
}

function ReasonDialog({title, onCancel, onSubmit}: {title: string; onCancel: () => void; onSubmit: (reason: string) => void}) {
  const [reason, setReason] = useState('')
  return (
    <Dialog
      id="review-reason"
      header={title}
      width={1}
      onClose={onCancel}
      footer={
        <Flex justify="flex-end" gap={2} padding={3}>
          <Button mode="bleed" text="Cancel" fontSize={1} padding={2} onClick={onCancel} />
          <Button tone="primary" text={title} fontSize={1} padding={2} onClick={() => onSubmit(reason.trim())} />
        </Flex>
      }
    >
      <Stack gap={3} padding={4}>
        <Text as="label" htmlFor="review-reason-text" size={1} weight="medium">
          What needs to change?
        </Text>
        <TextArea id="review-reason-text" rows={4} fontSize={1} padding={3} value={reason} onChange={(event) => setReason(event.currentTarget.value)} />
      </Stack>
    </Dialog>
  )
}

function ReviewSession({doc, instanceId, disabled}: {doc: PostDocument; instanceId: string; disabled: boolean}) {
  const engine = useEngine()
  const session = useWorkflowSession({engine, instanceId})
  const mirror = useMirrorStatus(doc)
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [asking, setAsking] = useState<ReviewAction | null>(null)

  if (session.invalid) return <Unavailable message={`The review workflow can’t be read (${session.invalid.reason}).`} />
  if (session.error) return <Unavailable message={workflowErrorMessage(session.error)} />
  if (session.evaluationError) return <Unavailable message={workflowErrorMessage(session.evaluationError)} />
  if (!session.ready || !session.evaluation) return null

  const evaluation = session.evaluation
  const actions: ReviewAction[] = evaluation.currentStage.activities.flatMap((activity) =>
    activity.actions
      .filter((action) => actionRendering(action) === 'button')
      .map((action) => ({
        activity: activity.activity.name,
        name: action.action.name,
        title: action.action.title ?? action.action.name,
        allowed: action.allowed,
      })),
  )
  const changeRequest = evaluation.instance.fields.find((entry) => entry.name === 'changeRequest')?.value
  const primary = actions.filter((action) => PRIMARY_ACTIONS.has(action.name))
  const secondary = actions.filter((action) => !PRIMARY_ACTIONS.has(action.name))

  const fire = async (action: ReviewAction, params?: Record<string, unknown>) => {
    setBusy(action.name)
    try {
      const result = await session.fireAction({activity: action.activity, action: action.name, params})
      await mirror(result.instance.currentStage)
    } catch (error) {
      toast.push({status: 'error', title: `${action.title} failed`, description: workflowErrorMessage(error)})
    } finally {
      setBusy(null)
    }
  }
  const choose = (action: ReviewAction) => (REASON_ACTIONS.has(action.name) ? setAsking(action) : void fire(action))
  const locked = disabled || busy !== null

  return (
    <>
      {typeof changeRequest === 'string' && changeRequest && evaluation.instance.currentStage === 'draft' && (
        <Tooltip portal padding={2} content={<Text size={1}>{changeRequest}</Text>}>
          <Badge tone="caution" fontSize={1}>
            Changes requested
          </Badge>
        </Tooltip>
      )}
      {primary.map((action, index) => (
        <Button
          key={action.name}
          tone={action.name === 'approve' ? 'positive' : 'primary'}
          mode={index > 0 ? 'ghost' : 'default'}
          text={action.title}
          fontSize={1}
          padding={2}
          disabled={!action.allowed || locked}
          loading={busy === action.name}
          onClick={() => choose(action)}
        />
      ))}
      {secondary.length > 0 && (
        <MenuButton
          id="review-more"
          button={<Button mode="bleed" icon={ChevronDownIcon} fontSize={1} padding={2} aria-label="More review actions" disabled={locked} />}
          popover={{portal: true, placement: 'bottom-end'}}
          menu={
            <Menu>
              {secondary.map((action) => (
                <MenuItem key={action.name} text={action.title} fontSize={1} padding={2} disabled={!action.allowed} onClick={() => choose(action)} />
              ))}
            </Menu>
          }
        />
      )}
      {asking && (
        <ReasonDialog
          title={asking.title}
          onCancel={() => setAsking(null)}
          onSubmit={(reason) => {
            const action = asking
            setAsking(null)
            void fire(action, reason ? {reason} : undefined)
          }}
        />
      )}
    </>
  )
}

/**
 * Review and approval controls, driven by the post's Sanity Workflows instance. A post without one
 * (new, or created before workflows existed) gets one on open; the workflow joins at the stage that
 * matches the post's status.
 */
export function ReviewWorkflow({doc, disabled}: {doc: PostDocument; disabled: boolean}) {
  const postId = doc._id.replace(/^drafts\./, '')
  const {instanceId, loading, error} = usePostReview(postId)
  const start = useStartPostReview()
  const [startError, setStartError] = useState<string | null>(null)
  const started = useRef<string | null>(null)
  const status: WorkflowStatus = doc.workflowStatus ?? 'idea'
  const needsStart = !loading && !error && !instanceId && !isLockedStatus(status)

  useEffect(() => {
    if (!needsStart || started.current === postId) return
    started.current = postId
    setStartError(null)
    start(postId).catch((cause: unknown) => setStartError(workflowErrorMessage(cause) || errorMessage(cause)))
  }, [needsStart, postId, start])

  if (error) return <Unavailable message={workflowErrorMessage(error)} />
  if (startError) {
    return (
      <Unavailable
        message={`${startError} If the review workflow isn’t deployed yet, run “pnpm workflows:deploy” in the repository.`}
      />
    )
  }
  if (!instanceId) return null
  return <ReviewSession doc={doc} instanceId={instanceId} disabled={disabled} />
}
