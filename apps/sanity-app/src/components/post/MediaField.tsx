import {ArrowLeftIcon} from '@sanity/icons/ArrowLeft'
import {ArrowRightIcon} from '@sanity/icons/ArrowRight'
import {PlayIcon} from '@sanity/icons/Play'
import {TrashIcon} from '@sanity/icons/Trash'
import {UploadIcon} from '@sanity/icons/Upload'
import {Box, Button, Card, Flex, Grid, Spinner, Stack, Text, TextInput} from '@sanity/ui'
import {editDocument, useApplyDocumentActions, useClient, useDocument, type DocumentHandle} from '@sanity/sdk-react'
import {INSTAGRAM_LIMITS, type PostFormat} from '@social-studio/shared'
import {useRef, useState, type DragEvent} from 'react'

import {API_VERSION} from '../../config'
import {assetUrl, type MediaValue} from '../../lib/assets'
import {errorMessage} from '../../lib/backend'
import {randomKey} from '../../lib/keys'
import {FieldLabel} from '../Layout'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime']

interface FormatRules {
  accept: string[]
  max: number
  hint: string
}

function rulesFor(format: PostFormat | undefined): FormatRules {
  switch (format) {
    case 'carousel':
      return {
        accept: [...IMAGE_TYPES, ...VIDEO_TYPES],
        max: INSTAGRAM_LIMITS.carouselMaxItems,
        hint: `${INSTAGRAM_LIMITS.carouselMinItems}–${INSTAGRAM_LIMITS.carouselMaxItems} images or videos, shown in this order.`,
      }
    case 'reel':
      return {accept: VIDEO_TYPES, max: 1, hint: 'One MP4 or MOV video, ideally 9:16.'}
    case 'story':
      return {accept: [...IMAGE_TYPES, ...VIDEO_TYPES], max: 1, hint: 'One image or video, ideally 9:16.'}
    default:
      return {accept: IMAGE_TYPES, max: 1, hint: 'One JPEG or PNG image. Instagram accepts 4:5 to 1.91:1.'}
  }
}

function MediaTile({
  item,
  index,
  count,
  readOnly,
  onMove,
  onRemove,
  onAlt,
}: {
  item: MediaValue
  index: number
  count: number
  readOnly?: boolean
  onMove: (from: number, to: number) => void
  onRemove: () => void
  onAlt: (alt: string) => void
}) {
  const url = assetUrl(item.asset?._ref)
  const isVideo = item._type === 'socialVideo'
  return (
    <Card border radius={2} overflow="hidden">
      <Box style={{position: 'relative', aspectRatio: '1 / 1', background: 'var(--card-code-bg-color)'}}>
        {url && !isVideo && (
          <img
            src={`${url}?w=320&h=320&fit=crop`}
            alt={item.alt ?? ''}
            style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
          />
        )}
        {url && isVideo && (
          <video src={url} muted playsInline preload="metadata" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        )}
        {isVideo && (
          <Card radius={2} padding={1} style={{position: 'absolute', left: 6, top: 6, opacity: 0.9}}>
            <Text size={0}>
              <PlayIcon />
            </Text>
          </Card>
        )}
        {count > 1 && (
          <Card radius={2} paddingX={2} paddingY={1} style={{position: 'absolute', right: 6, top: 6, opacity: 0.9}}>
            <Text size={0}>{index + 1}</Text>
          </Card>
        )}
      </Box>
      <Stack gap={2} padding={2}>
        {!isVideo && (
          <TextInput
            fontSize={1}
            padding={2}
            placeholder="Alt text"
            value={item.alt ?? ''}
            readOnly={readOnly}
            onChange={(event) => onAlt(event.currentTarget.value)}
            aria-label={`Alt text for item ${index + 1}`}
          />
        )}
        {!readOnly && (
          <Flex gap={1} justify="flex-end">
            {count > 1 && (
              <>
                <Button mode="bleed" icon={ArrowLeftIcon} fontSize={1} padding={2} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move earlier" />
                <Button mode="bleed" icon={ArrowRightIcon} fontSize={1} padding={2} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label="Move later" />
              </>
            )}
            <Button mode="bleed" tone="critical" icon={TrashIcon} fontSize={1} padding={2} onClick={onRemove} aria-label="Remove" />
          </Flex>
        )}
      </Stack>
    </Card>
  )
}

export function MediaField({handle, format, readOnly}: {handle: DocumentHandle; format: PostFormat | undefined; readOnly?: boolean}) {
  const {data} = useDocument<MediaValue[]>({...handle, path: 'media'})
  const apply = useApplyDocumentActions()
  const client = useClient({apiVersion: API_VERSION})
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const media = data ?? []
  const rules = rulesFor(format)
  const remaining = Math.max(0, rules.max - media.length)

  const upload = async (files: File[]) => {
    setError(null)
    const accepted = files.filter((file) => rules.accept.includes(file.type))
    if (accepted.length < files.length) {
      setError(`Some files were skipped. This format accepts: ${rules.accept.map((type) => type.split('/')[1]).join(', ')}.`)
    }
    const batch = accepted.slice(0, remaining)
    if (accepted.length > remaining) setError(`This format takes at most ${rules.max} item${rules.max === 1 ? '' : 's'}.`)
    if (batch.length === 0) return

    setUploading((count) => count + batch.length)
    try {
      const items: MediaValue[] = []
      for (const file of batch) {
        const isVideo = file.type.startsWith('video/')
        const asset = await client.assets.upload(isVideo ? 'file' : 'image', file, {filename: file.name})
        items.push({
          _key: randomKey(),
          _type: isVideo ? 'socialVideo' : 'socialImage',
          asset: {_ref: asset._id},
        })
      }
      await apply(
        editDocument(handle, [
          {setIfMissing: {media: []}},
          {
            insert: {
              after: 'media[-1]',
              items: items.map((item) => ({...item, asset: {_type: 'reference', _ref: item.asset?._ref}})),
            },
          },
        ]),
      )
    } catch (uploadError) {
      setError(`Upload failed: ${errorMessage(uploadError)}`)
    } finally {
      setUploading((count) => Math.max(0, count - batch.length))
    }
  }

  const move = (from: number, to: number) => {
    const next = [...media]
    const [item] = next.splice(from, 1)
    if (!item) return
    next.splice(to, 0, item)
    void apply(editDocument(handle, {set: {media: next}}))
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!readOnly) void upload(Array.from(event.dataTransfer.files))
  }

  return (
    <Stack gap={3}>
      <FieldLabel label="Media" description={rules.hint} />
      {media.length > rules.max && (
        <Text size={1} muted>
          This format uses {rules.max === 1 ? 'a single item' : `up to ${rules.max} items`}; remove {media.length - rules.max}.
        </Text>
      )}
      {media.length > 0 && (
        <Grid gridTemplateColumns={[2, 3, 4]} gap={2}>
          {media.map((item, index) => (
            <MediaTile
              key={item._key}
              item={item}
              index={index}
              count={media.length}
              readOnly={readOnly}
              onMove={move}
              onRemove={() => void apply(editDocument(handle, {unset: [`media[_key=="${item._key}"]`]}))}
              onAlt={(alt) => void apply(editDocument(handle, {set: {[`media[_key=="${item._key}"].alt`]: alt}}))}
            />
          ))}
        </Grid>
      )}
      {!readOnly && remaining > 0 && (
        <Card
          border
          radius={2}
          padding={4}
          tone={dragging ? 'primary' : 'transparent'}
          style={{borderStyle: 'dashed'}}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Flex align="center" justify="center" gap={3}>
            {uploading > 0 ? (
              <>
                <Text size={1} muted>
                  <Spinner />
                </Text>
                <Text size={1} muted>
                  Uploading {uploading} file{uploading === 1 ? '' : 's'}…
                </Text>
              </>
            ) : (
              <>
                <Text size={1} muted>
                  Drop files here or
                </Text>
                <Button mode="ghost" icon={UploadIcon} text="Upload" fontSize={1} padding={2} onClick={() => inputRef.current?.click()} />
              </>
            )}
          </Flex>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple={remaining > 1}
            accept={rules.accept.join(',')}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? [])
              event.currentTarget.value = ''
              void upload(files)
            }}
          />
        </Card>
      )}
      {error && (
        <Card tone="critical" radius={2} padding={2}>
          <Text size={1}>{error}</Text>
        </Card>
      )}
    </Stack>
  )
}

export function CoverImageField({handle, readOnly}: {handle: DocumentHandle; readOnly?: boolean}) {
  const {data} = useDocument<{asset?: {_ref?: string}}>({...handle, path: 'coverImage'})
  const apply = useApplyDocumentActions()
  const client = useClient({apiVersion: API_VERSION})
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = assetUrl(data?.asset?._ref)

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('The cover must be a JPEG, PNG or WebP image.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const asset = await client.assets.upload('image', file, {filename: file.name})
      await apply(editDocument(handle, {set: {coverImage: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}}}))
    } catch (uploadError) {
      setError(`Upload failed: ${errorMessage(uploadError)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={3}>
      <FieldLabel label="Reel cover" description="Optional. Instagram uses a frame from the video when empty." />
      <Flex gap={3} align="center">
        <Card border radius={2} overflow="hidden" style={{width: 54, height: 96, flex: 'none'}}>
          {url && <img src={`${url}?w=108&h=192&fit=crop`} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
        </Card>
        {!readOnly && (
          <Flex gap={2}>
            <Button mode="ghost" icon={UploadIcon} text={url ? 'Replace' : 'Upload cover'} fontSize={1} padding={2} loading={busy} onClick={() => inputRef.current?.click()} />
            {url && <Button mode="bleed" tone="critical" text="Remove" fontSize={1} padding={2} onClick={() => void apply(editDocument(handle, {unset: ['coverImage']}))} />}
          </Flex>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={IMAGE_TYPES.join(',')}
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
