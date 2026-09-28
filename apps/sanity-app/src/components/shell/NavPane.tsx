import {CalendarIcon} from '@sanity/icons/Calendar'
import {ChartUpwardIcon} from '@sanity/icons/ChartUpward'
import {CogIcon} from '@sanity/icons/Cog'
import {DashboardIcon} from '@sanity/icons/Dashboard'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {ImagesIcon} from '@sanity/icons/Images'
import {RocketIcon} from '@sanity/icons/Rocket'
import {SparklesIcon} from '@sanity/icons/Sparkles'
import {UsersIcon} from '@sanity/icons/Users'
import {Avatar, Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {useCurrentUser} from '@sanity/sdk-react'
import {Suspense, type ComponentType} from 'react'

import {useRouter, type Route, type RouteName} from '../../lib/router'

interface NavItem {
  id: RouteName
  label: string
  icon: ComponentType
  route: Route
  /** Names of routes that highlight this item (detail pages). */
  matches: RouteName[]
  planned?: boolean
}

const PRIMARY: NavItem[] = [
  {id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, route: {name: 'dashboard'}, matches: ['dashboard']},
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarIcon,
    route: {name: 'calendar', view: 'month'},
    matches: ['calendar'],
  },
  {id: 'content', label: 'Content', icon: DocumentsIcon, route: {name: 'content'}, matches: ['content', 'post']},
  {id: 'campaigns', label: 'Campaigns', icon: RocketIcon, route: {name: 'campaigns'}, matches: ['campaigns', 'campaign']},
  {id: 'clients', label: 'Clients', icon: UsersIcon, route: {name: 'clients'}, matches: ['clients', 'client']},
  {id: 'media', label: 'Media', icon: ImagesIcon, route: {name: 'media'}, matches: ['media']},
  {id: 'analytics', label: 'Analytics', icon: ChartUpwardIcon, route: {name: 'analytics'}, matches: ['analytics'], planned: true},
]

const SECONDARY: NavItem[] = [
  {id: 'ai', label: 'AI Studio', icon: SparklesIcon, route: {name: 'ai'}, matches: ['ai'], planned: true},
  {id: 'settings', label: 'Settings', icon: CogIcon, route: {name: 'settings'}, matches: ['settings']},
]

function NavButton({item, compact}: {item: NavItem; compact: boolean}) {
  const {route, navigate} = useRouter()
  const selected = item.matches.includes(route.name)
  const button = (
    <Button
      mode="bleed"
      selected={selected}
      icon={item.icon}
      text={compact ? undefined : item.label}
      iconRight={
        !compact && item.planned ? (
          <Text size={0} muted>
            Soon
          </Text>
        ) : undefined
      }
      justify="flex-start"
      fontSize={1}
      padding={compact ? 3 : 2}
      width="fill"
      aria-label={item.label}
      aria-current={selected ? 'page' : undefined}
      onClick={() => navigate(item.route)}
    />
  )
  if (!compact) return button
  return (
    <Tooltip content={<Text size={1}>{item.label}</Text>} placement="right" portal padding={2}>
      {button}
    </Tooltip>
  )
}

function CurrentUserRow({compact}: {compact: boolean}) {
  const user = useCurrentUser()
  if (!user) return null
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <Flex align="center" gap={2} padding={2}>
      <Avatar size={0} src={user.profileImage} initials={initials} title={user.name} />
      {!compact && (
        <Stack gap={1} flex={1} style={{minWidth: 0}}>
          <Text size={1} textOverflow="ellipsis">
            {user.name}
          </Text>
          <Text size={0} muted textOverflow="ellipsis">
            {user.email}
          </Text>
        </Stack>
      )}
    </Flex>
  )
}

export function NavPane({compact}: {compact: boolean}) {
  return (
    <Card borderRight style={{width: compact ? 53 : 212, flex: 'none', height: '100%'}}>
      <Flex direction="column" style={{height: '100%'}}>
        {!compact && (
          <Box paddingX={3} paddingTop={3} paddingBottom={2}>
            <Text size={1} weight="medium">
              Social Studio
            </Text>
          </Box>
        )}
        <Stack gap={1} padding={2} paddingTop={compact ? 2 : 1}>
          {PRIMARY.map((item) => (
            <NavButton key={item.id} item={item} compact={compact} />
          ))}
        </Stack>
        <Box paddingX={2}>
          <Card borderTop />
        </Box>
        <Stack gap={1} padding={2}>
          {SECONDARY.map((item) => (
            <NavButton key={item.id} item={item} compact={compact} />
          ))}
        </Stack>
        <Box flex={1} />
        <Card borderTop padding={1}>
          <Suspense fallback={null}>
            <CurrentUserRow compact={compact} />
          </Suspense>
        </Card>
      </Flex>
    </Card>
  )
}
