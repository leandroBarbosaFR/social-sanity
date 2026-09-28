import {Box, Card, Flex, Text} from '@sanity/ui'
import {
  editorialStage,
  PUBLISHING_PHASE_LABELS,
  publishingPhase,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_TONES,
  type PublishingPhase,
  type StatusTone,
  type WorkflowStatus,
} from '@social-studio/shared'
import {styled} from 'styled-components'

const Dot = styled.span<{$tone: StatusTone}>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  background-color: ${({$tone}) => `var(--card-badge-${$tone}-dot-color)`};
`

export function StatusDot({tone}: {tone: StatusTone}) {
  return <Dot $tone={tone} aria-hidden />
}

/** A dot plus label. `chip` renders the bordered pill used for document state, as in Studio. */
export function ToneLabel({
  tone,
  label,
  variant = 'inline',
}: {
  tone: StatusTone
  label: string
  variant?: 'inline' | 'chip'
}) {
  const content = (
    <Flex align="center" gap={2}>
      <StatusDot tone={tone} />
      <Text size={1} muted={variant === 'inline'} textOverflow="ellipsis">
        {label}
      </Text>
    </Flex>
  )
  if (variant === 'inline') return content
  return (
    <Card border radius={2} paddingX={2} paddingY={1} tone="transparent" style={{display: 'inline-block'}}>
      {content}
    </Card>
  )
}

export function StatusBadge({status, variant}: {status: WorkflowStatus | null | undefined; variant?: 'inline' | 'chip'}) {
  if (!status) {
    return (
      <Box>
        <Text size={1} muted>
          —
        </Text>
      </Box>
    )
  }
  return <ToneLabel tone={WORKFLOW_STATUS_TONES[status]} label={WORKFLOW_STATUS_LABELS[status]} variant={variant} />
}

/** The review-workflow half of a status (Idea … Approved). */
export function WorkflowStageBadge({status}: {status: WorkflowStatus | null | undefined}) {
  const stage = editorialStage(status)
  return <ToneLabel tone={WORKFLOW_STATUS_TONES[stage]} label={WORKFLOW_STATUS_LABELS[stage]} />
}

const PHASE_TONES: Record<PublishingPhase, StatusTone> = {
  unscheduled: 'default',
  scheduled: 'primary',
  publishing: 'primary',
  published: 'positive',
  failed: 'critical',
}

/** The publishing half of a status (Not scheduled, Scheduled, Publishing, Published, Failed). */
export function PublishingBadge({status}: {status: WorkflowStatus | null | undefined}) {
  const phase = publishingPhase(status)
  if (phase === 'unscheduled') {
    return (
      <Text size={1} muted>
        —
      </Text>
    )
  }
  return <ToneLabel tone={PHASE_TONES[phase]} label={PUBLISHING_PHASE_LABELS[phase]} />
}
