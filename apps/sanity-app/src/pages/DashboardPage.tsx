import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {RocketIcon} from '@sanity/icons/Rocket'
import {UsersIcon} from '@sanity/icons/Users'
import {Box, Button, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import {useQuery} from '@sanity/sdk-react'
import {WORKFLOW_STATUS_TONES} from '@social-studio/shared'
import {Suspense, useState, type ComponentType} from 'react'

import {FORMAT_ICONS} from '../components/FormatLabel'
import {Page, PageBody, PageHeader, Section} from '../components/Layout'
import {PostListItem} from '../components/PostListItem'
import {LoadingState} from '../components/States'
import {StatusDot} from '../components/StatusBadge'
import {addDays, dayKey, formatRelative, formatTime, formatWeekday, isSameDay, startOfDay, startOfWeek} from '../lib/dates'
import {POST_SUMMARY_FIELDS, type PostSummary} from '../lib/queries'
import {useRouter} from '../lib/router'
import {useWorkspace} from '../lib/workspace'

const CLIENT_FILTER = '(!defined($clientId) || client._ref == $clientId)'

const DASHBOARD_QUERY = `{
  "approval": *[_type == "socialPost" && workflowStatus in ["internalReview", "clientReview"] && ${CLIENT_FILTER}]
    | order(coalesce(scheduledAt, _updatedAt) asc)[0...8]{${POST_SUMMARY_FIELDS}},
  "approvalCount": count(*[_type == "socialPost" && workflowStatus in ["internalReview", "clientReview"] && ${CLIENT_FILTER}]),
  "weekCount": count(*[_type == "socialPost" && workflowStatus in ["scheduled", "publishing"] && scheduledAt >= $weekStart && scheduledAt < $weekEnd && ${CLIENT_FILTER}]),
  "failures": *[_type == "socialPost" && workflowStatus == "failed" && ${CLIENT_FILTER}]
    | order(_updatedAt desc)[0...8]{${POST_SUMMARY_FIELDS}},
  "failureCount": count(*[_type == "socialPost" && workflowStatus == "failed" && ${CLIENT_FILTER}]),
  "publishedCount": count(*[_type == "socialPost" && workflowStatus == "published" && publishedAt >= $weekAgo && ${CLIENT_FILTER}]),
  "upcoming": *[_type == "socialPost" && defined(scheduledAt) && scheduledAt >= $today && scheduledAt < $horizon
    && workflowStatus != "published" && ${CLIENT_FILTER}] | order(scheduledAt asc)[0...60]{${POST_SUMMARY_FIELDS}},
  "recent": *[_type in ["socialPost", "campaign", "client"] && (_type == "client" || ${CLIENT_FILTER})]
    | order(_updatedAt desc)[0...10]{_id, _originalId, _type, _updatedAt, "title": coalesce(title, name), workflowStatus}
}`

interface RecentItem {
  _id: string
  /** With the drafts perspective `_id` is the published ID; `_originalId` tells us it's a draft. */
  _originalId?: string
  _type: 'socialPost' | 'campaign' | 'client'
  _updatedAt: string
  title: string | null
  workflowStatus: PostSummary['workflowStatus']
}

interface DashboardData {
  approval: PostSummary[]
  approvalCount: number
  weekCount: number
  failures: PostSummary[]
  failureCount: number
  publishedCount: number
  upcoming: PostSummary[]
  recent: RecentItem[]
}

const TYPE_ICONS: Record<RecentItem['_type'], ComponentType> = {
  socialPost: DocumentTextIcon,
  campaign: RocketIcon,
  client: UsersIcon,
}

function Stat({label, value, tone, onClick}: {label: string; value: number; tone?: 'critical' | 'caution'; onClick: () => void}) {
  return (
    <Card as="button" type="button" padding={3} onClick={onClick} style={{textAlign: 'left', flex: 1}}>
      <Stack gap={3}>
        <Text size={1} muted>
          {label}
        </Text>
        <Flex align="center" gap={2}>
          {tone && value > 0 && <StatusDot tone={tone} />}
          <Text size={2} weight="semibold">
            {value}
          </Text>
        </Flex>
      </Stack>
    </Card>
  )
}

function UpcomingTimeline({posts, today}: {posts: PostSummary[]; today: Date}) {
  const {navigate} = useRouter()
  const days = Array.from({length: 7}, (_, index) => addDays(today, index))
  return (
    <Stack>
      {days.map((day, index) => {
        const dayPosts = posts.filter((post) => post.scheduledAt && isSameDay(new Date(post.scheduledAt), day))
        return (
          <Card key={dayKey(day)} borderTop={index > 0} paddingX={3} paddingY={2}>
            <Flex gap={3} align="flex-start">
              <Box style={{width: 64, flex: 'none'}} paddingTop={2}>
                <Text size={1} muted={index > 0} weight={index === 0 ? 'medium' : undefined}>
                  {index === 0 ? 'Today' : `${formatWeekday(day)} ${day.getDate()}`}
                </Text>
              </Box>
              <Stack gap={1} flex={1} style={{minWidth: 0}}>
                {dayPosts.length === 0 && (
                  <Box paddingY={2}>
                    <Text size={1} muted>
                      —
                    </Text>
                  </Box>
                )}
                {dayPosts.map((post) => {
                  const Icon = post.format ? FORMAT_ICONS[post.format] : DocumentTextIcon
                  return (
                    <Card
                      key={post._id}
                      as="button"
                      type="button"
                      radius={2}
                      padding={2}
                      onClick={() => navigate({name: 'post', id: post._id})}
                      style={{textAlign: 'left'}}
                    >
                      <Flex align="center" gap={2}>
                        {post.workflowStatus && <StatusDot tone={WORKFLOW_STATUS_TONES[post.workflowStatus]} />}
                        <Text size={1} muted style={{flex: 'none'}}>
                          {post.scheduledAt ? formatTime(post.scheduledAt) : ''}
                        </Text>
                        <Text size={1} muted>
                          <Icon />
                        </Text>
                        <Text size={1} textOverflow="ellipsis" style={{minWidth: 0}}>
                          {post.title || 'Untitled post'}
                        </Text>
                        <Text size={1} muted textOverflow="ellipsis" style={{marginLeft: 'auto', flex: 'none', maxWidth: 140}}>
                          {post.clientName}
                        </Text>
                      </Flex>
                    </Card>
                  )
                })}
              </Stack>
            </Flex>
          </Card>
        )
      })}
    </Stack>
  )
}

function DashboardContent() {
  const {clientId} = useWorkspace()
  const {navigate} = useRouter()
  // Fixed per mount so the query key stays stable between renders.
  const [anchors] = useState(() => {
    const today = startOfDay(new Date())
    const weekStart = startOfWeek(today)
    return {
      today,
      params: {
        today: today.toISOString(),
        horizon: addDays(today, 7).toISOString(),
        weekStart: weekStart.toISOString(),
        weekEnd: addDays(weekStart, 7).toISOString(),
        weekAgo: addDays(today, -7).toISOString(),
      },
    }
  })
  const {data} = useQuery<DashboardData>({query: DASHBOARD_QUERY, params: {...anchors.params, clientId}})

  return (
    <Stack gap={4}>
      <Card border radius={2} overflow="hidden">
        <Flex wrap="wrap">
          <Stat label="Awaiting approval" value={data.approvalCount} tone="caution" onClick={() => navigate({name: 'content', status: 'review'})} />
          <Card borderLeft />
          <Stat label="Scheduled this week" value={data.weekCount} onClick={() => navigate({name: 'calendar', view: 'week'})} />
          <Card borderLeft />
          <Stat label="Publishing failures" value={data.failureCount} tone="critical" onClick={() => navigate({name: 'content', status: 'failed'})} />
          <Card borderLeft />
          <Stat label="Published, last 7 days" value={data.publishedCount} onClick={() => navigate({name: 'content', status: 'published'})} />
        </Flex>
      </Card>

      <Grid gridTemplateColumns={[1, 1, 1, 2]} gap={4}>
        <Stack gap={4}>
          <Section title="Needs approval" count={data.approvalCount}>
            {data.approval.length === 0 ? (
              <Box padding={3}>
                <Text size={1} muted>
                  Nothing is waiting for review.
                </Text>
              </Box>
            ) : (
              <Stack>
                {data.approval.map((post) => (
                  <PostListItem key={post._id} post={post} />
                ))}
              </Stack>
            )}
          </Section>

          <Section title="Publishing failures" count={data.failureCount}>
            {data.failures.length === 0 ? (
              <Box padding={3}>
                <Text size={1} muted>
                  No failed posts.
                </Text>
              </Box>
            ) : (
              <Stack>
                {data.failures.map((post) => (
                  <PostListItem key={post._id} post={post} meta="error" />
                ))}
              </Stack>
            )}
          </Section>
        </Stack>

        <Stack gap={4}>
          <Section
            title="Upcoming"
            actions={
              <Button
                mode="bleed"
                fontSize={1}
                padding={1}
                text="Calendar"
                onClick={() => navigate({name: 'calendar', view: 'week'})}
              />
            }
          >
            <UpcomingTimeline posts={data.upcoming} today={anchors.today} />
          </Section>

          <Section title="Recent activity">
            <Stack>
              {data.recent.map((item) => {
                const Icon = TYPE_ICONS[item._type]
                const open = () =>
                  item._type === 'socialPost'
                    ? navigate({name: 'post', id: item._id})
                    : item._type === 'campaign'
                      ? navigate({name: 'campaign', id: item._id})
                      : navigate({name: 'client', id: item._id, tab: 'general'})
                return (
                  <Card key={item._id} as="button" type="button" paddingX={3} paddingY={2} onClick={open} style={{textAlign: 'left'}}>
                    <Flex align="center" gap={3}>
                      <Text size={1} muted>
                        <Icon />
                      </Text>
                      <Text size={1} textOverflow="ellipsis" style={{flex: 1, minWidth: 0}}>
                        {item.title || 'Untitled'}
                      </Text>
                      {item._originalId?.startsWith('drafts.') && (
                        <Text size={0} muted>
                          Draft
                        </Text>
                      )}
                      <Text size={1} muted style={{flex: 'none'}}>
                        {formatRelative(item._updatedAt)}
                      </Text>
                    </Flex>
                  </Card>
                )
              })}
            </Stack>
          </Section>
        </Stack>
      </Grid>
    </Stack>
  )
}

export function DashboardPage() {
  const today = new Intl.DateTimeFormat(undefined, {weekday: 'long', day: 'numeric', month: 'long'}).format(new Date())
  return (
    <Page>
      <PageHeader title="Dashboard" description={today} />
      <PageBody>
        <Suspense fallback={<LoadingState label="Loading dashboard…" />}>
          <DashboardContent />
        </Suspense>
      </PageBody>
    </Page>
  )
}
