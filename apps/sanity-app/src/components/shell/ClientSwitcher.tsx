import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {Box, Button, Card, Flex, Text} from '@sanity/ui'
import {Menu, MenuButton, MenuDivider, MenuItem} from '@sanity/ui/menu'
import {useQuery} from '@sanity/sdk-react'
import {Suspense} from 'react'

import {CLIENT_OPTIONS_QUERY, type ClientOption} from '../../lib/queries'
import {useWorkspace} from '../../lib/workspace'

/** Square monogram, like the project chip in the Sanity Dashboard header. */
export function Monogram({name, size = 20}: {name: string | null; size?: number}) {
  return (
    <Card
      tone="primary"
      radius={1}
      style={{width: size, height: size, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
    >
      <Text size={0} weight="semibold">
        {(name ?? '?').trim().charAt(0).toUpperCase()}
      </Text>
    </Card>
  )
}

function SwitcherButton({label}: {label: string}) {
  return (
    <Button mode="bleed" padding={2} fontSize={1}>
      <Flex align="center" gap={2}>
        <Monogram name={label} />
        <Text size={1} weight="medium" textOverflow="ellipsis" style={{maxWidth: 180}}>
          {label}
        </Text>
        <Text size={1} muted>
          <ChevronDownIcon />
        </Text>
      </Flex>
    </Button>
  )
}

function ClientSwitcherMenu() {
  const {clientId, setClientId} = useWorkspace()
  const {data: clients} = useQuery<ClientOption[]>({query: CLIENT_OPTIONS_QUERY})
  const current = clients.find((client) => client._id === clientId)
  // A remembered client that was deleted falls back to all clients.
  const label = current?.name ?? 'All clients'

  return (
    <MenuButton
      id="client-switcher"
      button={<SwitcherButton label={label} />}
      popover={{portal: true, placement: 'bottom-start'}}
      menu={
        <Menu style={{minWidth: 220}}>
          <MenuItem
            text="All clients"
            fontSize={1}
            padding={2}
            iconRight={!current ? CheckmarkIcon : undefined}
            onClick={() => setClientId(null)}
          />
          {clients.length > 0 && <MenuDivider />}
          {clients.map((client) => (
            <MenuItem
              key={client._id}
              fontSize={1}
              padding={2}
              text={client.name ?? 'Untitled client'}
              iconRight={client._id === current?._id ? CheckmarkIcon : undefined}
              onClick={() => setClientId(client._id)}
            />
          ))}
        </Menu>
      }
    />
  )
}

export function ClientSwitcher() {
  return (
    <Suspense
      fallback={
        <Box>
          <SwitcherButton label="All clients" />
        </Box>
      }
    >
      <ClientSwitcherMenu />
    </Suspense>
  )
}
