import {CloseIcon} from '@sanity/icons/Close'
import {Box, Button, Card, Flex, Select, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {
  editDocument,
  useApplyDocumentActions,
  useDocument,
  useEditDocument,
  useQuery,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {
  composeCaption,
  INSTAGRAM_LIMITS,
  normalizeHashtag,
  POST_FORMAT_LABELS,
  POST_FORMATS,
  type PostFormat,
} from '@social-studio/shared'
import {Suspense, useCallback, useId, useState, type ClipboardEvent, type KeyboardEvent} from 'react'

import {fromLocalInputValue, toLocalInputValue} from '../../lib/dates'
import {CAMPAIGN_OPTIONS_QUERY, CLIENT_OPTIONS_QUERY, type CampaignOption, type ClientOption} from '../../lib/queries'
import type {Reference} from '../../lib/types'
import {FORMAT_ICONS} from '../FormatLabel'
import {FieldLabel} from '../Layout'

interface FieldProps {
  handle: DocumentHandle
  readOnly?: boolean
}

/** Reads and writes one document path, straight to the Content Lake. `undefined` unsets it. */
function useField<T>(handle: DocumentHandle, path: string) {
  const {data} = useDocument<T>({...handle, path})
  const edit = useEditDocument<T>({...handle, path})
  const apply = useApplyDocumentActions()
  const set = useCallback(
    (value: T | undefined) => (value === undefined ? apply(editDocument(handle, {unset: [path]})) : edit(value)),
    [apply, edit, handle, path],
  )
  return [data, set] as const
}

export function TitleField({handle, readOnly}: FieldProps) {
  const id = useId()
  const [title, setTitle] = useField<string>(handle, 'title')
  return (
    <Stack gap={3}>
      <FieldLabel label="Title" description="Internal name. Not published." htmlFor={id} />
      <TextInput
        id={id}
        fontSize={1}
        padding={3}
        value={title ?? ''}
        readOnly={readOnly}
        onChange={(event) => void setTitle(event.currentTarget.value)}
      />
    </Stack>
  )
}

function ClientSelect({handle, readOnly, value}: FieldProps & {value: string}) {
  const apply = useApplyDocumentActions()
  const {data: clients} = useQuery<ClientOption[]>({query: CLIENT_OPTIONS_QUERY})
  return (
    <Select
      fontSize={1}
      padding={3}
      value={value}
      disabled={readOnly}
      aria-label="Client"
      onChange={(event) => {
        const next = event.currentTarget.value
        // A campaign belongs to one client, so changing the client clears it.
        void apply(
          editDocument(
            handle,
            next
              ? {set: {client: {_type: 'reference', _ref: next}}, unset: ['campaign']}
              : {unset: ['client', 'campaign']},
          ),
        )
      }}
    >
      <option value="">Select a client…</option>
      {clients.map((client) => (
        <option key={client._id} value={client._id}>
          {client.name ?? 'Untitled client'}
        </option>
      ))}
    </Select>
  )
}

function CampaignSelect({handle, readOnly, clientId}: FieldProps & {clientId: string | undefined}) {
  const [campaign, setCampaign] = useField<Reference>(handle, 'campaign')
  const {data: campaigns} = useQuery<CampaignOption[]>({
    query: CAMPAIGN_OPTIONS_QUERY,
    params: {clientId: clientId ?? null},
  })
  return (
    <Select
      fontSize={1}
      padding={3}
      value={campaign?._ref ?? ''}
      disabled={readOnly || !clientId}
      aria-label="Campaign"
      onChange={(event) => {
        const next = event.currentTarget.value
        void setCampaign(next ? {_type: 'reference', _ref: next} : undefined)
      }}
    >
      <option value="">{clientId ? 'No campaign' : 'Select a client first'}</option>
      {campaigns.map((option) => (
        <option key={option._id} value={option._id}>
          {option.title ?? 'Untitled campaign'}
        </option>
      ))}
    </Select>
  )
}

const selectFallback = (
  <Select fontSize={1} padding={3} disabled>
    <option>Loading…</option>
  </Select>
)

export function ClientCampaignFields({handle, readOnly}: FieldProps) {
  const {data: client} = useDocument<Reference>({...handle, path: 'client'})
  return (
    <Flex gap={3} wrap="wrap">
      <Stack gap={3} flex={1} style={{minWidth: 200}}>
        <FieldLabel label="Client" />
        <Suspense fallback={selectFallback}>
          <ClientSelect handle={handle} readOnly={readOnly} value={client?._ref ?? ''} />
        </Suspense>
      </Stack>
      <Stack gap={3} flex={1} style={{minWidth: 200}}>
        <FieldLabel label="Campaign" />
        <Suspense fallback={selectFallback}>
          <CampaignSelect handle={handle} readOnly={readOnly} clientId={client?._ref} />
        </Suspense>
      </Stack>
    </Flex>
  )
}

export function FormatField({handle, readOnly}: FieldProps) {
  const [format, setFormat] = useField<PostFormat>(handle, 'format')
  return (
    <Stack gap={3}>
      <FieldLabel label="Format" />
      <Card border radius={2} padding={1} style={{display: 'inline-flex', alignSelf: 'flex-start'}}>
        <Flex gap={1} role="radiogroup" aria-label="Format">
          {POST_FORMATS.map((option) => (
            <Button
              key={option}
              role="radio"
              aria-checked={format === option}
              mode="bleed"
              selected={format === option}
              icon={FORMAT_ICONS[option]}
              text={POST_FORMAT_LABELS[option]}
              fontSize={1}
              padding={2}
              disabled={readOnly}
              onClick={() => void setFormat(option)}
            />
          ))}
        </Flex>
      </Card>
    </Stack>
  )
}

export function CaptionField({handle, readOnly, format}: FieldProps & {format: PostFormat | undefined}) {
  const id = useId()
  const [caption, setCaption] = useField<string>(handle, 'caption')
  const {data: hashtags} = useDocument<string[]>({...handle, path: 'hashtags'})
  const length = composeCaption(caption, hashtags).length
  const over = length > INSTAGRAM_LIMITS.captionMaxLength
  return (
    <Stack gap={3}>
      <FieldLabel
        label="Caption"
        htmlFor={id}
        description={format === 'story' ? 'Instagram does not show captions on Stories; this stays internal.' : undefined}
      />
      <TextArea
        id={id}
        fontSize={1}
        padding={3}
        rows={7}
        value={caption ?? ''}
        readOnly={readOnly}
        customValidity={over ? 'Caption is too long' : undefined}
        onChange={(event) => void setCaption(event.currentTarget.value)}
      />
      <Text size={1} muted align="right">
        <span style={over ? {color: 'var(--card-badge-critical-fg-color)'} : undefined}>{length}</span> /{' '}
        {INSTAGRAM_LIMITS.captionMaxLength} incl. hashtags
      </Text>
    </Stack>
  )
}

export function HashtagsField({handle, readOnly}: FieldProps) {
  const id = useId()
  const [hashtags, setHashtags] = useField<string[]>(handle, 'hashtags')
  const [draft, setDraft] = useState('')
  const [rejected, setRejected] = useState<string | null>(null)
  const tags = hashtags ?? []

  const add = (raw: string) => {
    const candidates = raw.split(/[\s,]+/).filter(Boolean)
    const next = [...tags]
    let invalid: string | null = null
    for (const candidate of candidates) {
      const tag = normalizeHashtag(candidate)
      if (!tag) invalid = candidate
      else if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }
    setRejected(invalid)
    if (next.length !== tags.length) void setHashtags(next)
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault()
      if (draft.trim()) add(draft)
    } else if (event.key === 'Backspace' && !draft && tags.length) {
      void setHashtags(tags.slice(0, -1))
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (/[\s,#]/.test(text)) {
      event.preventDefault()
      add(text)
    }
  }

  return (
    <Stack gap={3}>
      <FieldLabel label="Hashtags" htmlFor={id} description={`${tags.length} / ${INSTAGRAM_LIMITS.hashtagsMax}`} />
      <Card border radius={2} padding={1}>
        <Flex gap={1} wrap="wrap" align="center">
          {tags.map((tag) => (
            <Card key={tag} radius={2} tone="primary" paddingLeft={2} paddingRight={readOnly ? 2 : 0} paddingY={readOnly ? 2 : 0}>
              <Flex align="center" gap={1}>
                <Text size={1}>#{tag}</Text>
                {!readOnly && (
                  <Button
                    mode="bleed"
                    icon={CloseIcon}
                    fontSize={0}
                    padding={2}
                    aria-label={`Remove #${tag}`}
                    onClick={() => void setHashtags(tags.filter((existing) => existing !== tag))}
                  />
                )}
              </Flex>
            </Card>
          ))}
          {!readOnly && (
            <Box flex={1} style={{minWidth: 140}}>
              <TextInput
                id={id}
                border={false}
                fontSize={1}
                padding={2}
                placeholder={tags.length ? 'Add hashtag' : 'Type a hashtag and press Enter'}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onBlur={() => draft.trim() && add(draft)}
              />
            </Box>
          )}
        </Flex>
      </Card>
      {rejected && (
        <Text size={1} muted>
          “{rejected}” was skipped: hashtags can only contain letters, numbers and underscores.
        </Text>
      )}
    </Stack>
  )
}

export function ScheduleField({handle, readOnly}: FieldProps) {
  const id = useId()
  const [scheduledAt, setScheduledAt] = useField<string>(handle, 'scheduledAt')
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <Stack gap={3}>
      <FieldLabel label="Publish date and time" htmlFor={id} description={`Shown in your time zone (${zone}).`} />
      <Flex gap={2} align="center">
        <Box style={{width: 240}}>
          <TextInput
            id={id}
            type="datetime-local"
            fontSize={1}
            padding={3}
            readOnly={readOnly}
            value={toLocalInputValue(scheduledAt)}
            onChange={(event) => void setScheduledAt(fromLocalInputValue(event.currentTarget.value) ?? undefined)}
          />
        </Box>
        {scheduledAt && !readOnly && (
          <Button mode="bleed" fontSize={1} padding={2} text="Clear" onClick={() => void setScheduledAt(undefined)} />
        )}
      </Flex>
    </Stack>
  )
}
