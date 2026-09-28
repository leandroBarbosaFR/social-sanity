import {ChevronLeftIcon} from '@sanity/icons/ChevronLeft'
import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {Box, Button, Card, Flex, Select, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {Tooltip} from '@sanity/ui/tooltip'
import {editDocument, publishDocument, useApplyDocumentActions, useQuery} from '@sanity/sdk-react'
import {
  isLockedStatus,
  POST_FORMAT_LABELS,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_TONES,
  WORKFLOW_STATUSES,
} from '@social-studio/shared'
import {Suspense, useMemo, useState, type DragEvent} from 'react'

import {FORMAT_ICONS} from '../components/FormatLabel'
import {InstagramGlyph} from '../components/InstagramGlyph'
import {Page, PageHeader} from '../components/Layout'
import {LoadingState} from '../components/States'
import {StatusDot} from '../components/StatusBadge'
import {errorMessage} from '../lib/backend'
import {
  addDays,
  dayKey,
  formatMonth,
  formatTime,
  formatWeekday,
  isSameDay,
  moveToDay,
  parseDayKey,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../lib/dates'
import {CLIENT_OPTIONS_QUERY, POST_SUMMARY_FIELDS, type ClientOption, type PostSummary} from '../lib/queries'
import {useRouter, type CalendarView} from '../lib/router'
import {useWorkspace} from '../lib/workspace'

const RANGE_QUERY = `*[_type == "socialPost" && defined(scheduledAt) && scheduledAt >= $from && scheduledAt < $to
  && (!defined($clientId) || client._ref == $clientId)
  && (!defined($status) || workflowStatus == $status)] | order(scheduledAt asc){${POST_SUMMARY_FIELDS}}`

const MONTH_LIMIT = 3
const DRAG_TYPE = 'application/x-social-post'

interface Filters {
  clientId: string
  status: string
}

function PostBlock({post, detailed}: {post: PostSummary; detailed?: boolean}) {
  const {navigate} = useRouter()
  const locked = isLockedStatus(post.workflowStatus ?? undefined)
  const Icon = post.format ? FORMAT_ICONS[post.format] : null
  const tone = post.workflowStatus ? WORKFLOW_STATUS_TONES[post.workflowStatus] : 'default'

  const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({id: post._id, scheduledAt: post.scheduledAt, status: post.workflowStatus}))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Tooltip
      portal
      padding={2}
      placement="top"
      content={
        <Stack gap={2}>
          <Text size={1} weight="medium">
            {post.title || 'Untitled post'}
          </Text>
          <Text size={1} muted>
            {[post.clientName, post.format ? POST_FORMAT_LABELS[post.format] : null, post.workflowStatus ? WORKFLOW_STATUS_LABELS[post.workflowStatus] : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!locked && (
            <Text size={0} muted>
              Drag to another day to reschedule
            </Text>
          )}
        </Stack>
      }
    >
      <Card
        as="button"
        type="button"
        radius={2}
        border
        paddingX={2}
        paddingY={1}
        draggable={!locked}
        onDragStart={onDragStart}
        onClick={() => navigate({name: 'post', id: post._id})}
        style={{width: '100%', textAlign: 'left', cursor: locked ? 'pointer' : 'grab'}}
      >
        <Stack gap={2} paddingY={1}>
          <Flex align="center" gap={2}>
            <StatusDot tone={tone} />
            <Text size={0} muted style={{flex: 'none'}}>
              {post.scheduledAt ? formatTime(post.scheduledAt) : ''}
            </Text>
            <Text size={0} muted style={{flex: 'none'}}>
              <InstagramGlyph />
            </Text>
            {Icon && (
              <Text size={0} muted style={{flex: 'none'}}>
                <Icon />
              </Text>
            )}
            <Text size={0} textOverflow="ellipsis" style={{minWidth: 0}}>
              {post.clientName ?? 'No client'}
            </Text>
          </Flex>
          {detailed && (
            <Text size={1} textOverflow="ellipsis">
              {post.title || 'Untitled post'}
            </Text>
          )}
        </Stack>
      </Card>
    </Tooltip>
  )
}

function useReschedule() {
  const apply = useApplyDocumentActions()
  const toast = useToast()
  return (event: DragEvent<HTMLElement>, day: Date) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData(DRAG_TYPE)
    if (!raw) return
    const payload = JSON.parse(raw) as {id: string; scheduledAt: string | null; status: string | null}
    if (!payload.scheduledAt) return
    const next = moveToDay(payload.scheduledAt, day)
    if (dayKey(new Date(next)) === dayKey(new Date(payload.scheduledAt))) return
    if (payload.status === 'scheduled' && new Date(next).getTime() <= Date.now()) {
      toast.push({status: 'warning', title: 'Cannot reschedule into the past'})
      return
    }
    const handle = {documentId: payload.id, documentType: 'socialPost'}
    // Scheduled posts are published so the scheduler sees the new time; others stay drafts.
    const actions =
      payload.status === 'scheduled'
        ? [editDocument(handle, {set: {scheduledAt: next}}), publishDocument(handle)]
        : [editDocument(handle, {set: {scheduledAt: next}})]
    apply(actions).catch((error: unknown) =>
      toast.push({status: 'error', title: 'Reschedule failed', description: errorMessage(error)}),
    )
  }
}

function DayCell({
  day,
  posts,
  muted,
  view,
  onMore,
}: {
  day: Date
  posts: PostSummary[]
  muted: boolean
  view: CalendarView
  onMore: () => void
}) {
  const [over, setOver] = useState(false)
  const reschedule = useReschedule()
  const today = isSameDay(day, new Date())
  const visible = view === 'month' ? posts.slice(0, MONTH_LIMIT) : posts
  const hidden = posts.length - visible.length

  return (
    <Card
      borderRight
      borderBottom
      padding={1}
      tone={over ? 'primary' : muted ? 'transparent' : 'default'}
      style={{minHeight: view === 'month' ? 118 : 420, minWidth: 0}}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) {
          event.preventDefault()
          setOver(true)
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        reschedule(event, day)
      }}
    >
      <Stack gap={1}>
        <Flex paddingX={1} paddingY={1} align="center" gap={2}>
          {view === 'week' && (
            <Text size={1} muted>
              {formatWeekday(day)}
            </Text>
          )}
          <Card
            radius={6}
            tone={today ? 'primary' : 'inherit'}
            style={{borderRadius: 999, minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center'}}
          >
            <Text size={1} muted={muted && !today} weight={today ? 'semibold' : undefined}>
              {day.getDate()}
            </Text>
          </Card>
        </Flex>
        {visible.map((post) => (
          <PostBlock key={post._id} post={post} detailed={view === 'week'} />
        ))}
        {hidden > 0 && (
          <Button mode="bleed" fontSize={0} padding={1} text={`+${hidden} more`} justify="flex-start" onClick={onMore} />
        )}
      </Stack>
    </Card>
  )
}

function CalendarGrid({view, anchor, filters}: {view: CalendarView; anchor: Date; filters: Filters}) {
  const {navigate} = useRouter()
  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor)
      return Array.from({length: 7}, (_, index) => addDays(start, index))
    }
    const first = startOfWeek(startOfMonth(anchor))
    const nextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    const count = Math.ceil((nextMonth.getTime() - first.getTime()) / 86_400_000 / 7) * 7
    return Array.from({length: count}, (_, index) => addDays(first, index))
  }, [view, anchor])

  const from = days[0] ?? anchor
  const to = addDays(days[days.length - 1] ?? anchor, 1)
  const {data: posts} = useQuery<PostSummary[]>({
    query: RANGE_QUERY,
    params: {
      from: from.toISOString(),
      to: to.toISOString(),
      clientId: filters.clientId || null,
      status: filters.status || null,
    },
  })

  const byDay = useMemo(() => {
    const map = new Map<string, PostSummary[]>()
    for (const post of posts) {
      if (!post.scheduledAt) continue
      const key = dayKey(new Date(post.scheduledAt))
      map.set(key, [...(map.get(key) ?? []), post])
    }
    return map
  }, [posts])

  return (
    <Box style={{overflow: 'auto', height: '100%'}}>
      <Box style={{minWidth: 840}}>
        {view === 'month' && (
          <Box style={{display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'}}>
            {days.slice(0, 7).map((day) => (
              <Card key={dayKey(day)} borderRight borderBottom paddingX={2} paddingY={2}>
                <Text size={1} muted>
                  {formatWeekday(day)}
                </Text>
              </Card>
            ))}
          </Box>
        )}
        <Box style={{display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))'}}>
          {days.map((day) => (
            <DayCell
              key={dayKey(day)}
              day={day}
              view={view}
              muted={view === 'month' && day.getMonth() !== anchor.getMonth()}
              posts={byDay.get(dayKey(day)) ?? []}
              onMore={() => navigate({name: 'calendar', view: 'week', date: dayKey(day)})}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function ClientSelect({value, onChange}: {value: string; onChange: (value: string) => void}) {
  const {data} = useQuery<ClientOption[]>({query: CLIENT_OPTIONS_QUERY})
  return (
    <Select fontSize={1} padding={2} value={value} onChange={(event) => onChange(event.currentTarget.value)} aria-label="Client">
      <option value="">All clients</option>
      {data.map((client) => (
        <option key={client._id} value={client._id}>
          {client.name ?? 'Untitled client'}
        </option>
      ))}
    </Select>
  )
}

export function CalendarPage({view, date}: {view: CalendarView; date?: string}) {
  const {navigate} = useRouter()
  const {clientId} = useWorkspace()
  const [filters, setFilters] = useState<Filters>({clientId: clientId ?? '', status: ''})
  const anchor = useMemo(() => parseDayKey(date) ?? startOfDay(new Date()), [date])

  const go = (next: Date, nextView: CalendarView = view) => navigate({name: 'calendar', view: nextView, date: dayKey(next)})
  const step = (direction: 1 | -1) =>
    go(view === 'week' ? addDays(anchor, 7 * direction) : new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1))

  const weekStart = startOfWeek(anchor)
  const title =
    view === 'month'
      ? formatMonth(anchor)
      : `${weekStart.toLocaleDateString(undefined, {day: 'numeric', month: 'short'})} – ${addDays(weekStart, 6).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'})}`

  return (
    <Page>
      <PageHeader
        title="Calendar"
        actions={
          <Flex gap={2} align="center" wrap="wrap">
            <Box style={{width: 150}}>
              <Suspense
                fallback={
                  <Select fontSize={1} padding={2} disabled>
                    <option>All clients</option>
                  </Select>
                }
              >
                <ClientSelect value={filters.clientId} onChange={(value) => setFilters((current) => ({...current, clientId: value}))} />
              </Suspense>
            </Box>
            <Box style={{width: 150}}>
              <Select
                fontSize={1}
                padding={2}
                value={filters.status}
                onChange={(event) => {
                  const status = event.currentTarget.value
                  setFilters((current) => ({...current, status}))
                }}
                aria-label="Status"
              >
                <option value="">All statuses</option>
                {WORKFLOW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WORKFLOW_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Box>
            <Card border radius={2} padding={1}>
              <Flex gap={1}>
                {(['month', 'week'] as const).map((option) => (
                  <Button
                    key={option}
                    mode="bleed"
                    selected={view === option}
                    text={option === 'month' ? 'Month' : 'Week'}
                    fontSize={1}
                    padding={2}
                    onClick={() => go(anchor, option)}
                  />
                ))}
              </Flex>
            </Card>
          </Flex>
        }
      >
        <Flex align="center" gap={2}>
          <Button mode="ghost" text="Today" fontSize={1} padding={2} onClick={() => go(startOfDay(new Date()))} />
          <Button mode="bleed" icon={ChevronLeftIcon} fontSize={1} padding={2} aria-label="Previous" onClick={() => step(-1)} />
          <Button mode="bleed" icon={ChevronRightIcon} fontSize={1} padding={2} aria-label="Next" onClick={() => step(1)} />
          <Text size={1} weight="medium">
            {title}
          </Text>
        </Flex>
      </PageHeader>
      <Box flex={1} style={{minHeight: 0}}>
        <Suspense fallback={<LoadingState label="Loading calendar…" />}>
          <CalendarGrid view={view} anchor={anchor} filters={filters} />
        </Suspense>
      </Box>
    </Page>
  )
}
