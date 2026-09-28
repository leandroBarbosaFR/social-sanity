import {Button, Flex, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {Tooltip} from '@sanity/ui/tooltip'
import {publishDocument, useApplyDocumentActions, useQuery} from '@sanity/sdk-react'
import {useState} from 'react'

import {errorMessage} from '../lib/backend'
import {formatDateTime} from '../lib/dates'
import {ToneLabel} from './StatusBadge'

const STATE_QUERY = `{
  "draft": *[_id == $draftId][0]{_updatedAt},
  "published": *[_id == $id][0]{_updatedAt}
}`

interface DocumentState {
  draft: {_updatedAt: string} | null
  published: {_updatedAt: string} | null
}

/** Whether the post has unpublished edits, from the raw (unmerged) perspective. */
export function useDocumentState(documentId: string): DocumentState {
  const {data} = useQuery<DocumentState>({
    query: STATE_QUERY,
    params: {id: documentId, draftId: `drafts.${documentId}`},
    perspective: 'raw',
  })
  return data
}

/** Published / Draft chips, as in Studio's document header. */
export function DocumentStateChips({documentId}: {documentId: string}) {
  const state = useDocumentState(documentId)
  return (
    <Flex gap={1}>
      <Tooltip
        portal
        padding={2}
        content={
          <Text size={1}>{state.published ? `Saved ${formatDateTime(state.published._updatedAt)}` : 'Never saved'}</Text>
        }
      >
        <span>
          <ToneLabel tone={state.published ? 'positive' : 'default'} label="Published" variant="chip" />
        </span>
      </Tooltip>
      {state.draft && (
        <Tooltip portal padding={2} content={<Text size={1}>Unsaved changes. Save to make them visible to scheduling.</Text>}>
          <span>
            <ToneLabel tone="caution" label="Draft" variant="chip" />
          </span>
        </Tooltip>
      )}
    </Flex>
  )
}


/** Saves (publishes) pending draft changes of any document. */
export function SaveButton({documentId, documentType}: {documentId: string; documentType: string}) {
  const state = useDocumentState(documentId)
  const apply = useApplyDocumentActions()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      mode={state.draft ? 'default' : 'ghost'}
      tone={state.draft ? 'primary' : 'default'}
      text={state.draft ? 'Save' : 'Saved'}
      fontSize={1}
      padding={2}
      loading={busy}
      disabled={!state.draft}
      onClick={() => {
        setBusy(true)
        apply(publishDocument({documentId, documentType}))
          .catch((error: unknown) => toast.push({status: 'error', title: 'Save failed', description: errorMessage(error)}))
          .finally(() => setBusy(false))
      }}
    />
  )
}
