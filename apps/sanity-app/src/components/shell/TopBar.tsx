import {AddIcon} from '@sanity/icons/Add'
import {BellIcon} from '@sanity/icons/Bell'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {RocketIcon} from '@sanity/icons/Rocket'
import {SearchIcon} from '@sanity/icons/Search'
import {SparklesIcon} from '@sanity/icons/Sparkles'
import {UsersIcon} from '@sanity/icons/Users'
import {Box, Button, Card, Flex, Text, TextInput} from '@sanity/ui'
import {Menu, MenuButton, MenuItem} from '@sanity/ui/menu'
import {useToast} from '@sanity/ui/toast'
import {Tooltip} from '@sanity/ui/tooltip'
import {useEffect, useState} from 'react'

import {errorMessage} from '../../lib/backend'
import {useRouter} from '../../lib/router'
import {useCreateAndOpen, type CreatableType} from '../../lib/useCreate'
import {useWorkspace} from '../../lib/workspace'
import {ClientSwitcher} from './ClientSwitcher'

function SearchField() {
  const {search, setSearch} = useWorkspace()
  const {route, navigate} = useRouter()
  const [value, setValue] = useState(search)

  // Keep the field in sync when the search is cleared elsewhere (e.g. the content list).
  useEffect(() => setValue(search), [search])

  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed === search) return undefined
    const timeout = window.setTimeout(() => {
      setSearch(trimmed)
      if (trimmed && route.name !== 'content') navigate({name: 'content'})
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [value, search, setSearch, route.name, navigate])

  return (
    <TextInput
      icon={SearchIcon}
      placeholder="Search content"
      fontSize={1}
      padding={2}
      radius={2}
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      clearButton={value ? true : undefined}
      onClear={() => setValue('')}
      aria-label="Search content"
    />
  )
}

function CreateMenu() {
  const create = useCreateAndOpen()
  const toast = useToast()
  const run = (type: CreatableType) => {
    create(type).catch((error: unknown) =>
      toast.push({status: 'error', title: 'Could not create document', description: errorMessage(error)}),
    )
  }
  return (
    <MenuButton
      id="create-menu"
      button={<Button icon={AddIcon} text="Create" tone="primary" fontSize={1} padding={2} />}
      popover={{portal: true, placement: 'bottom-end'}}
      menu={
        <Menu>
          <MenuItem icon={DocumentTextIcon} text="Post" fontSize={1} padding={2} onClick={() => run('socialPost')} />
          <MenuItem icon={RocketIcon} text="Campaign" fontSize={1} padding={2} onClick={() => run('campaign')} />
          <MenuItem icon={UsersIcon} text="Client" fontSize={1} padding={2} onClick={() => run('client')} />
        </Menu>
      }
    />
  )
}

export function TopBar({assistantOpen, onToggleAssistant}: {assistantOpen: boolean; onToggleAssistant: () => void}) {
  return (
    <Card borderBottom paddingX={2} paddingY={2} style={{flex: 'none'}}>
      <Flex align="center" gap={2}>
        <ClientSwitcher />
        <Box flex={1} />
        <Box style={{width: '100%', maxWidth: 280}}>
          <SearchField />
        </Box>
        <CreateMenu />
        <Button
          mode={assistantOpen ? 'default' : 'bleed'}
          icon={SparklesIcon}
          padding={2}
          fontSize={1}
          selected={assistantOpen}
          aria-label="Assistant"
          title="Assistant"
          onClick={onToggleAssistant}
        />
        <Tooltip content={<Text size={1}>Notifications are not available yet</Text>} portal padding={2}>
          <span>
            <Button mode="bleed" icon={BellIcon} padding={2} fontSize={1} disabled aria-label="Notifications" />
          </span>
        </Tooltip>
      </Flex>
    </Card>
  )
}
