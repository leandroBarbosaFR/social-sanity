import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {CloseIcon} from '@sanity/icons/Close'
import {Box, Card, Flex, Text} from '@sanity/ui'
import {
  EDITORIAL_STAGES,
  editorialStage,
  publishingPhase,
  WORKFLOW_STATUS_LABELS,
  type WorkflowStatus,
} from '@social-studio/shared'
import {Fragment} from 'react'
import {styled} from 'styled-components'

type StepState = 'done' | 'current' | 'upcoming' | 'failed'

const Marker = styled.span<{$state: StepState}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex: none;
  font-size: 13px;
  border: 1px solid
    ${({$state}) =>
      $state === 'upcoming'
        ? 'var(--card-border-color)'
        : $state === 'failed'
          ? 'var(--card-badge-critical-dot-color)'
          : $state === 'current'
            ? 'var(--card-badge-primary-dot-color)'
            : 'var(--card-badge-positive-dot-color)'};
  color: ${({$state}) => ($state === 'failed' ? 'var(--card-badge-critical-dot-color)' : 'var(--card-badge-positive-dot-color)')};
  background: ${({$state}) => ($state === 'current' ? 'var(--card-badge-primary-dot-color)' : 'transparent')};
  box-shadow: ${({$state}) => ($state === 'current' ? 'inset 0 0 0 3px var(--card-bg-color)' : 'none')};
`

const Rule = styled.span<{$done: boolean}>`
  flex: 1;
  min-width: 12px;
  height: 1px;
  background: ${({$done}) => ($done ? 'var(--card-badge-positive-dot-color)' : 'var(--card-border-color)')};
`

interface Step {
  id: string
  label: string
  state: StepState
}

function stepsFor(status: WorkflowStatus | null | undefined): {review: Step[]; publishing: Step[]} {
  const stage = editorialStage(status)
  const stageIndex = EDITORIAL_STAGES.indexOf(stage)
  const phase = publishingPhase(status)
  const approved = stage === 'approved'

  const review: Step[] = EDITORIAL_STAGES.map((id, index) => ({
    id,
    label: WORKFLOW_STATUS_LABELS[id],
    // Approved counts as done once the post has moved on to publishing.
    state: index < stageIndex || (approved && phase !== 'unscheduled') ? 'done' : index === stageIndex ? 'current' : 'upcoming',
  }))

  const order = ['scheduled', 'publishing', 'published'] as const
  const reached = phase === 'failed' ? 1 : order.indexOf(phase as (typeof order)[number])
  const publishing: Step[] = order.map((id, index) => {
    if (phase === 'failed' && id === 'publishing') return {id, label: 'Failed', state: 'failed'}
    const state: StepState = !approved || reached < index ? 'upcoming' : reached === index && id !== 'published' ? 'current' : 'done'
    return {id, label: WORKFLOW_STATUS_LABELS[id], state}
  })
  return {review, publishing}
}

function Track({steps}: {steps: Step[]}) {
  return (
    <Flex align="center" gap={2} style={{minWidth: 0}}>
      {steps.map((step, index) => (
        <Fragment key={step.id}>
          {index > 0 && <Rule $done={step.state === 'done' || step.state === 'current'} />}
          <Flex align="center" gap={2} style={{flex: 'none'}}>
            <Marker $state={step.state} aria-hidden>
              {step.state === 'done' && <CheckmarkIcon />}
              {step.state === 'failed' && <CloseIcon />}
            </Marker>
            <Text size={1} weight={step.state === 'current' ? 'medium' : 'regular'} muted={step.state === 'upcoming'}>
              {step.label}
            </Text>
          </Flex>
        </Fragment>
      ))}
    </Flex>
  )
}

/**
 * Where the post stands: the review workflow (driven by Sanity Workflows) and, once approved, the
 * publishing lifecycle (driven by the publishing service).
 */
export function WorkflowStepper({status}: {status: WorkflowStatus | null | undefined}) {
  const {review, publishing} = stepsFor(status)
  return (
    <Card border radius={2} paddingX={3} paddingY={3} tone="transparent">
      <Flex gap={4} align="center" wrap="wrap">
        <Box flex={3} style={{minWidth: 320}}>
          <Text size={0} muted weight="medium" style={{marginBottom: 10, display: 'block', textTransform: 'uppercase', letterSpacing: 0.4}}>
            Review · Sanity Workflows
          </Text>
          <Track steps={review} />
        </Box>
        <Box flex={2} style={{minWidth: 240}}>
          <Text size={0} muted weight="medium" style={{marginBottom: 10, display: 'block', textTransform: 'uppercase', letterSpacing: 0.4}}>
            Publishing · Instagram
          </Text>
          <Track steps={publishing} />
        </Box>
      </Flex>
    </Card>
  )
}
