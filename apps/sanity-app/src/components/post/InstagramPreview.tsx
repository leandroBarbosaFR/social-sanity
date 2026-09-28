import {BookmarkIcon} from '@sanity/icons/Bookmark'
import {ChevronLeftIcon} from '@sanity/icons/ChevronLeft'
import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {CommentIcon} from '@sanity/icons/Comment'
import {EllipsisHorizontalIcon} from '@sanity/icons/EllipsisHorizontal'
import {HeartIcon} from '@sanity/icons/Heart'
import {ImageIcon} from '@sanity/icons/Image'
import {PlayIcon} from '@sanity/icons/Play'
import {ShareIcon} from '@sanity/icons/Share'
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import type {PostFormat, ResolvedMediaItem} from '@social-studio/shared'
import {useState, type CSSProperties, type ReactNode} from 'react'

export interface PreviewProps {
  format: PostFormat | undefined
  media: ResolvedMediaItem[]
  caption: string | undefined
  hashtags: string[] | undefined
  username: string | null
  avatarUrl: string | null
  coverUrl: string | null
}

const FILL: CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', display: 'block'}

function Avatar({url, size = 28}: {url: string | null; size?: number}) {
  return (
    <Card
      radius={6}
      tone="transparent"
      border
      overflow="hidden"
      style={{width: size, height: size, flex: 'none', borderRadius: '50%'}}
    >
      {url && <img src={`${url}?w=${size * 2}&h=${size * 2}&fit=crop`} alt="" style={FILL} />}
    </Card>
  )
}

function MediaSlot({item, aspect, cover}: {item: ResolvedMediaItem | undefined; aspect: string; cover?: string | null}) {
  return (
    <Box style={{position: 'relative', aspectRatio: aspect, background: 'var(--card-code-bg-color)', overflow: 'hidden'}}>
      {item?.url && item.kind === 'image' && <img src={`${item.url}?w=720`} alt={item.alt ?? ''} style={FILL} />}
      {item?.url && item.kind === 'video' && (
        <video src={item.url} poster={cover ?? undefined} muted playsInline loop autoPlay preload="metadata" style={FILL} />
      )}
      {!item?.url && (
        <Flex align="center" justify="center" style={{position: 'absolute', inset: 0}}>
          <Stack gap={3} style={{textAlign: 'center'}}>
            <Text size={3} muted>
              <ImageIcon />
            </Text>
            <Text size={1} muted>
              No media yet
            </Text>
          </Stack>
        </Flex>
      )}
    </Box>
  )
}

function CaptionText({username, caption, hashtags}: {username: string; caption?: string; hashtags?: string[]}) {
  if (!caption?.trim() && !hashtags?.length) {
    return (
      <Text size={1} muted>
        No caption
      </Text>
    )
  }
  return (
    <Text size={1} style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
      <strong>{username}</strong> {caption?.trim()}
      {hashtags && hashtags.length > 0 && (
        <>
          {caption?.trim() ? '\n\n' : ''}
          <span style={{color: 'var(--card-link-fg-color, var(--card-accent-fg-color))'}}>{hashtags.map((tag) => `#${tag}`).join(' ')}</span>
        </>
      )}
    </Text>
  )
}

function FeedHeader({username, avatarUrl, overlay}: {username: string; avatarUrl: string | null; overlay?: boolean}) {
  return (
    <Flex align="center" gap={2} paddingX={3} paddingY={2} style={overlay ? {position: 'absolute', top: 8, left: 0, right: 0} : undefined}>
      <Avatar url={avatarUrl} />
      <Text size={1} weight="semibold" textOverflow="ellipsis" style={{flex: 1}}>
        {username}
      </Text>
      <Text size={1} muted>
        <EllipsisHorizontalIcon />
      </Text>
    </Flex>
  )
}

function ActionRow() {
  return (
    <Flex gap={3} paddingX={3} paddingY={2} aria-hidden>
      <Text size={2}>
        <HeartIcon />
      </Text>
      <Text size={2}>
        <CommentIcon />
      </Text>
      <Text size={2}>
        <ShareIcon />
      </Text>
      <Box flex={1} />
      <Text size={2}>
        <BookmarkIcon />
      </Text>
    </Flex>
  )
}

function Carousel({media}: {media: ResolvedMediaItem[]}) {
  const [index, setIndex] = useState(0)
  const current = Math.min(index, Math.max(0, media.length - 1))
  return (
    <Box style={{position: 'relative'}}>
      <MediaSlot item={media[current]} aspect="4 / 5" />
      {media.length > 1 && (
        <>
          <Card radius={6} paddingX={2} paddingY={1} style={{position: 'absolute', top: 10, right: 10, opacity: 0.85}}>
            <Text size={0}>
              {current + 1}/{media.length}
            </Text>
          </Card>
          {current > 0 && (
            <Box style={{position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)'}}>
              <Button mode="ghost" icon={ChevronLeftIcon} padding={1} fontSize={1} onClick={() => setIndex(current - 1)} aria-label="Previous" />
            </Box>
          )}
          {current < media.length - 1 && (
            <Box style={{position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)'}}>
              <Button mode="ghost" icon={ChevronRightIcon} padding={1} fontSize={1} onClick={() => setIndex(current + 1)} aria-label="Next" />
            </Box>
          )}
        </>
      )}
      {media.length > 1 && (
        <Flex justify="center" gap={1} paddingTop={2} style={{position: 'absolute', bottom: -18, left: 0, right: 0}}>
          {media.map((item, dot) => (
            <span
              key={item._key}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: dot === current ? 'var(--card-accent-fg-color)' : 'var(--card-border-color)',
              }}
            />
          ))}
        </Flex>
      )}
    </Box>
  )
}

function Frame({children, label}: {children: ReactNode; label: string}) {
  return (
    <Stack gap={3}>
      <Text size={1} muted>
        {label}
      </Text>
      <Card border radius={3} overflow="hidden" style={{width: '100%', maxWidth: 340}}>
        {children}
      </Card>
    </Stack>
  )
}

/** A representative Instagram preview. It is not a pixel copy of Instagram's UI. */
export function InstagramPreview({format, media, caption, hashtags, username, avatarUrl, coverUrl}: PreviewProps) {
  const name = username ?? 'account'

  if (format === 'story') {
    return (
      <Frame label="Story preview">
        <Box style={{position: 'relative'}}>
          <MediaSlot item={media[0]} aspect="9 / 16" />
          <Box style={{position: 'absolute', top: 8, left: 10, right: 10}}>
            <Box style={{height: 2, borderRadius: 1, background: 'var(--card-fg-color)', opacity: 0.8}} />
          </Box>
          <Box style={{position: 'absolute', top: 12, left: 0, right: 0}}>
            <FeedHeader username={name} avatarUrl={avatarUrl} />
          </Box>
        </Box>
      </Frame>
    )
  }

  if (format === 'reel') {
    return (
      <Frame label="Reel preview">
        <Box style={{position: 'relative'}}>
          <MediaSlot item={media[0]} aspect="9 / 16" cover={coverUrl} />
          {!media[0]?.url && coverUrl && (
            <img src={`${coverUrl}?w=720`} alt="" style={{...FILL, position: 'absolute', inset: 0}} />
          )}
          <Flex align="center" justify="center" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
            <Card radius={6} padding={3} style={{opacity: 0.7, borderRadius: '50%'}}>
              <Text size={2}>
                <PlayIcon />
              </Text>
            </Card>
          </Flex>
          <Card padding={3} style={{position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0.92}}>
            <Stack gap={2}>
              <Flex align="center" gap={2}>
                <Avatar url={avatarUrl} size={22} />
                <Text size={1} weight="semibold">
                  {name}
                </Text>
              </Flex>
              <Box style={{maxHeight: 60, overflow: 'hidden'}}>
                <CaptionText username="" caption={caption} hashtags={hashtags} />
              </Box>
            </Stack>
          </Card>
        </Box>
      </Frame>
    )
  }

  return (
    <Frame label={format === 'carousel' ? 'Carousel preview' : 'Feed preview'}>
      <FeedHeader username={name} avatarUrl={avatarUrl} />
      {format === 'carousel' ? <Carousel media={media} /> : <MediaSlot item={media[0]} aspect="4 / 5" />}
      <Box paddingTop={format === 'carousel' && media.length > 1 ? 3 : 0}>
        <ActionRow />
      </Box>
      <Box paddingX={3} paddingBottom={3}>
        <CaptionText username={name} caption={caption} hashtags={hashtags} />
      </Box>
    </Frame>
  )
}
