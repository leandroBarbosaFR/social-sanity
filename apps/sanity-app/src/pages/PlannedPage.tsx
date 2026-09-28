import {Card, Stack, Text} from '@sanity/ui'

import {Page, PageBody, PageHeader} from '../components/Layout'

/** Honest placeholder for planned areas; it does not pretend to have data. */
export function PlannedPage({title, description}: {title: string; description: string}) {
  return (
    <Page>
      <PageHeader title={title} description="Planned" />
      <PageBody>
        <Card border radius={2} padding={4} style={{maxWidth: 560}}>
          <Stack gap={3}>
            <Text size={1} weight="medium">
              Not available yet
            </Text>
            <Text size={1} muted>
              {description}
            </Text>
          </Stack>
        </Card>
      </PageBody>
    </Page>
  )
}
