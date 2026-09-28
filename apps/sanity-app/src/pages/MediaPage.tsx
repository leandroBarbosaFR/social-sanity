import {PlayIcon} from '@sanity/icons/Play'
import {UploadIcon} from '@sanity/icons/Upload'
import {Box, Button, Card, Flex, Grid, Select, Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import {useClient, useQuery} from '@sanity/sdk-react'
import {Suspense, useRef, useState} from 'react'

import {API_VERSION} from '../config'
import {Page, PageBody, PageHeader} from '../components/Layout'
import {EmptyState, LoadingState} from '../components/States'
import {errorMessage} from '../lib/backend'
import {formatRelative} from '../lib/dates'

type MediaFilter = 'all' | 'images' | 'videos' | 'unused'

const PAGE_SIZE = 48

const MEDIA_QUERY = `*[(_type == "sanity.imageAsset" || (_type == "sanity.fileAsset" && mimeType match "video/*"))
  && ($filter != "images" || _type == "sanity.imageAsset")
  && ($filter != "videos" || _type == "sanity.fileAsset")
  && ($filter != "unused" || count(*[references(^._id)]) == 0)]
  | order(_createdAt desc)[0...$limit]{
    _id, _type, url, originalFilename, mimeType, size, _createdAt,
    "width": metadata.dimensions.width, "height": metadata.dimensions.height,
    "usedIn": count(*[_type == "socialPost" && references(^._id)])
  }`

interface MediaAsset {
  _id: string
  _type: 'sanity.imageAsset' | 'sanity.fileAsset'
  url: string
  originalFilename: string | null
  mimeType: string | null
  size: number | null
  _createdAt: string
  width: number | null
  height: number | null
  usedIn: number
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function MediaGrid({filter, limit, onMore}: {filter: MediaFilter; limit: number; onMore: () => void}) {
  const {data, isPending} = useQuery<MediaAsset[]>({query: MEDIA_QUERY, params: {filter, limit}})
  if (data.length === 0) return <EmptyState title="No media" description="Uploaded images and videos appear here." />
  return (
    <Stack gap={4}>
      <Grid gridTemplateColumns={[2, 3, 4, 6]} gap={3}>
        {data.map((asset) => {
          const isVideo = asset._type === 'sanity.fileAsset'
          return (
            <Card key={asset._id} border radius={2} overflow="hidden">
              <Box style={{position: 'relative', aspectRatio: '1 / 1', background: 'var(--card-code-bg-color)'}}>
                {isVideo ? (
                  <video src={asset.url} muted playsInline preload="metadata" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <img src={`${asset.url}?w=360&h=360&fit=crop`} alt="" loading="lazy" style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
                )}
                {isVideo && (
                  <Card radius={2} padding={1} style={{position: 'absolute', left: 6, top: 6, opacity: 0.9}}>
                    <Text size={0}>
                      <PlayIcon />
                    </Text>
                  </Card>
                )}
              </Box>
              <Stack gap={2} padding={2}>
                <Text size={1} textOverflow="ellipsis">
                  {asset.originalFilename ?? asset._id}
                </Text>
                <Text size={0} muted textOverflow="ellipsis">
                  {[asset.width && asset.height ? `${asset.width}×${asset.height}` : null, formatBytes(asset.size), formatRelative(asset._createdAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text size={0} muted>
                  {asset.usedIn === 0 ? 'Not used' : `Used in ${asset.usedIn} post${asset.usedIn === 1 ? '' : 's'}`}
                </Text>
              </Stack>
            </Card>
          )
        })}
      </Grid>
      {data.length >= limit && (
        <Flex justify="center">
          <Button mode="ghost" fontSize={1} padding={2} text={isPending ? 'Loading…' : 'Load more'} disabled={isPending} onClick={onMore} />
        </Flex>
      )}
    </Stack>
  )
}

export function MediaPage() {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const client = useClient({apiVersion: API_VERSION})
  const toast = useToast()

  const upload = async (files: File[]) => {
    setUploading(true)
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) await client.assets.upload('image', file, {filename: file.name})
        else if (file.type.startsWith('video/')) await client.assets.upload('file', file, {filename: file.name})
      }
    } catch (error) {
      toast.push({status: 'error', title: 'Upload failed', description: errorMessage(error)})
    } finally {
      setUploading(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Media"
        description="Images and videos in this dataset. Attach media to posts from the post editor."
        actions={
          <>
            <Box style={{width: 140}}>
              <Select
                fontSize={1}
                padding={2}
                value={filter}
                aria-label="Filter media"
                onChange={(event) => {
                  setFilter(event.currentTarget.value as MediaFilter)
                  setLimit(PAGE_SIZE)
                }}
              >
                <option value="all">All media</option>
                <option value="images">Images</option>
                <option value="videos">Videos</option>
                <option value="unused">Not used</option>
              </Select>
            </Box>
            <Button icon={UploadIcon} text="Upload" mode="ghost" fontSize={1} padding={2} loading={uploading} onClick={() => inputRef.current?.click()} />
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                void upload(files)
              }}
            />
          </>
        }
      />
      <PageBody>
        <Suspense fallback={<LoadingState label="Loading media…" />}>
          <MediaGrid filter={filter} limit={limit} onMore={() => setLimit((current) => current + PAGE_SIZE)} />
        </Suspense>
      </PageBody>
    </Page>
  )
}
