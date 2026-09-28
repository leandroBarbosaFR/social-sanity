import {CloseIcon} from '@sanity/icons/Close'
import {UploadIcon} from '@sanity/icons/Upload'
import {Box, Button, Card, Flex, Select, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {
  editDocument,
  useApplyDocumentActions,
  useClient,
  useDocument,
  useEditDocument,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {useCallback, useId, useRef, useState, type KeyboardEvent} from 'react'

import {API_VERSION} from '../config'
import {assetUrl} from '../lib/assets'
import {errorMessage} from '../lib/backend'
import {FieldLabel} from './Layout'

interface BaseFieldProps {
  handle: DocumentHandle
  path: string
  label: string
  description?: string
  readOnly?: boolean
}

/** Live read/write of one path; `undefined` or an empty string unsets it. */
export function useDocumentField<T>(handle: DocumentHandle, path: string) {
  const {data} = useDocument<T>({...handle, path})
  const edit = useEditDocument<T>({...handle, path})
  const apply = useApplyDocumentActions()
  const set = useCallback(
    (value: T | undefined) =>
      value === undefined || value === '' ? apply(editDocument(handle, {unset: [path]})) : edit(value),
    [apply, edit, handle, path],
  )
  return [data, set] as const
}

export function StringField({handle, path, label, description, readOnly, type = 'text', placeholder}: BaseFieldProps & {type?: 'text' | 'url' | 'date'; placeholder?: string}) {
  const id = useId()
  const [value, setValue] = useDocumentField<string>(handle, path)
  return (
    <Stack gap={3}>
      <FieldLabel label={label} description={description} htmlFor={id} />
      <TextInput
        id={id}
        type={type}
        fontSize={1}
        padding={3}
        placeholder={placeholder}
        readOnly={readOnly}
        value={value ?? ''}
        onChange={(event) => void setValue(event.currentTarget.value)}
      />
    </Stack>
  )
}

export function TextField({handle, path, label, description, readOnly, rows = 4}: BaseFieldProps & {rows?: number}) {
  const id = useId()
  const [value, setValue] = useDocumentField<string>(handle, path)
  return (
    <Stack gap={3}>
      <FieldLabel label={label} description={description} htmlFor={id} />
      <TextArea
        id={id}
        fontSize={1}
        padding={3}
        rows={rows}
        readOnly={readOnly}
        value={value ?? ''}
        onChange={(event) => void setValue(event.currentTarget.value)}
      />
    </Stack>
  )
}

export function SelectField({
  handle,
  path,
  label,
  description,
  readOnly,
  options,
}: BaseFieldProps & {options: {value: string; title: string}[]}) {
  const id = useId()
  const [value, setValue] = useDocumentField<string>(handle, path)
  return (
    <Stack gap={3}>
      <FieldLabel label={label} description={description} htmlFor={id} />
      <Select id={id} fontSize={1} padding={3} disabled={readOnly} value={value ?? ''} onChange={(event) => void setValue(event.currentTarget.value)}>
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.title}
          </option>
        ))}
      </Select>
    </Stack>
  )
}

/** An array of strings edited as tags. */
export function TagListField({handle, path, label, description, readOnly, placeholder = 'Add and press Enter'}: BaseFieldProps & {placeholder?: string}) {
  const id = useId()
  const [value, setValue] = useDocumentField<string[]>(handle, path)
  const [draft, setDraft] = useState('')
  const items = value ?? []

  const add = () => {
    const next = draft.trim()
    setDraft('')
    if (!next || items.some((item) => item.toLowerCase() === next.toLowerCase())) return
    void setValue([...items, next])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    } else if (event.key === 'Backspace' && !draft && items.length) {
      void setValue(items.slice(0, -1))
    }
  }

  return (
    <Stack gap={3}>
      <FieldLabel label={label} description={description} htmlFor={id} />
      <Card border radius={2} padding={1}>
        <Flex gap={1} wrap="wrap" align="center">
          {items.map((item) => (
            <Card key={item} radius={2} tone="transparent" border paddingLeft={2} paddingRight={readOnly ? 2 : 0} paddingY={readOnly ? 2 : 0}>
              <Flex align="center" gap={1}>
                <Text size={1}>{item}</Text>
                {!readOnly && (
                  <Button
                    mode="bleed"
                    icon={CloseIcon}
                    fontSize={0}
                    padding={2}
                    aria-label={`Remove ${item}`}
                    onClick={() => void setValue(items.filter((existing) => existing !== item))}
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
                placeholder={placeholder}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={onKeyDown}
                onBlur={add}
              />
            </Box>
          )}
        </Flex>
      </Card>
    </Stack>
  )
}

export function ImageField({handle, path, label, description, readOnly}: BaseFieldProps) {
  const {data} = useDocument<{asset?: {_ref?: string}}>({...handle, path})
  const apply = useApplyDocumentActions()
  const client = useClient({apiVersion: API_VERSION})
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = assetUrl(data?.asset?._ref)

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const asset = await client.assets.upload('image', file, {filename: file.name})
      await apply(editDocument(handle, {set: {[path]: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}}}))
    } catch (uploadError) {
      setError(`Upload failed: ${errorMessage(uploadError)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={3}>
      <FieldLabel label={label} description={description} />
      <Flex gap={3} align="center">
        <Card border radius={2} overflow="hidden" tone="transparent" style={{width: 56, height: 56, flex: 'none'}}>
          {url && <img src={`${url}?w=112&h=112&fit=crop`} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />}
        </Card>
        {!readOnly && (
          <Flex gap={2}>
            <Button mode="ghost" icon={UploadIcon} text={url ? 'Replace' : 'Upload'} fontSize={1} padding={2} loading={busy} onClick={() => inputRef.current?.click()} />
            {url && (
              <Button mode="bleed" tone="critical" text="Remove" fontSize={1} padding={2} onClick={() => void apply(editDocument(handle, {unset: [path]}))} />
            )}
          </Flex>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            void upload(file)
          }}
        />
      </Flex>
      {error && (
        <Text size={1} muted>
          {error}
        </Text>
      )}
    </Stack>
  )
}
