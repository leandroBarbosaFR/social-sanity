import {useChat} from '@ai-sdk/react'
import {AddIcon} from '@sanity/icons/Add'
import {ArrowUpIcon} from '@sanity/icons/ArrowUp'
import {CloseIcon} from '@sanity/icons/Close'
import {Box, Button, Card, Flex, Stack, Text, TextArea} from '@sanity/ui'
import {useAuthToken} from '@sanity/sdk-react'
import type {AssistantChatRequest} from '@social-studio/shared'
import {DefaultChatTransport, type UIMessage} from 'ai'
import {useEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react'

import {appConfig} from '../../config'
import {isBackendConfigured} from '../../lib/backend'
import {useRouter} from '../../lib/router'

const newThreadId = () => crypto.randomUUID().replaceAll('-', '')

function textOf(message: UIMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')
}

function Conversation({threadId, postId}: {threadId: string; postId: string | null}) {
  const token = useAuthToken()
  // The transport is built once per thread; read the latest token and post at send time.
  const latest = useRef({token, postId})
  latest.current = {token, postId}
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${appConfig.webUrl}/api/ai/chat`,
        prepareSendMessagesRequest: ({id, messages}) => {
          const last = messages.findLast((message) => message.role === 'user')
          const body: AssistantChatRequest = {
            threadId: id,
            message: last ? textOf(last) : '',
            ...(latest.current.postId ? {postId: latest.current.postId} : {}),
          }
          return {body, headers: {Authorization: `Bearer ${latest.current.token ?? ''}`}}
        },
      }),
    [],
  )
  const {messages, sendMessage, status, error, stop} = useChat({id: threadId, transport})
  const [input, setInput] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => end.current?.scrollIntoView({block: 'end'}), [messages])

  const send = () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    void sendMessage({text})
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <Flex direction="column" flex={1} style={{minHeight: 0}}>
      <Box flex={1} padding={3} style={{overflow: 'auto'}}>
        <Stack gap={3}>
          {messages.length === 0 && (
            <Text size={1} muted>
              Ask about your content, e.g. “What’s scheduled for next week?” or “Draft three post ideas for the spring
              campaign.” Drafts it creates stay unsaved until someone reviews them.
            </Text>
          )}
          {messages.map((message) => (
            <Card
              key={message.id}
              padding={3}
              radius={2}
              tone={message.role === 'user' ? 'primary' : 'transparent'}
              border={message.role !== 'user'}
              style={message.role === 'user' ? {marginLeft: 32} : {marginRight: 16}}
            >
              <Text size={1} style={{whiteSpace: 'pre-wrap'}}>
                {textOf(message)}
              </Text>
            </Card>
          ))}
          {status === 'submitted' && (
            <Text size={1} muted>
              Thinking…
            </Text>
          )}
          {error && (
            <Card tone="critical" border radius={2} padding={3}>
              <Text size={1}>{error.message}</Text>
            </Card>
          )}
          <div ref={end} />
        </Stack>
      </Box>
      <Card borderTop padding={2}>
        <Flex gap={2} align="flex-end">
          <Box flex={1}>
            <TextArea
              rows={2}
              fontSize={1}
              padding={2}
              placeholder="Ask the assistant…"
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              onKeyDown={onKeyDown}
              aria-label="Message the assistant"
            />
          </Box>
          {busy ? (
            <Button mode="ghost" text="Stop" fontSize={1} padding={2} onClick={() => void stop()} />
          ) : (
            <Button tone="primary" icon={ArrowUpIcon} padding={2} fontSize={1} aria-label="Send" disabled={!input.trim()} onClick={send} />
          )}
        </Flex>
      </Card>
    </Flex>
  )
}

/**
 * Content Agent assistant. Runs through the backend as the signed-in user; conversation history is
 * kept by Content Agent per thread, and "New chat" starts a fresh thread.
 */
export function AssistantPanel({onClose}: {onClose: () => void}) {
  const {route} = useRouter()
  const [threadId, setThreadId] = useState(newThreadId)
  const postId = route.name === 'post' ? route.id : null

  return (
    <Card borderLeft style={{width: 380, flex: 'none', height: '100%', display: 'flex', flexDirection: 'column'}}>
      <Card borderBottom paddingX={3} paddingY={2} style={{flex: 'none'}}>
        <Flex align="center" gap={2}>
          <Text size={1} weight="semibold" style={{flex: 1}}>
            Assistant
          </Text>
          <Button mode="bleed" icon={AddIcon} text="New chat" fontSize={1} padding={2} onClick={() => setThreadId(newThreadId())} />
          <Button mode="bleed" icon={CloseIcon} padding={2} fontSize={1} aria-label="Close assistant" onClick={onClose} />
        </Flex>
      </Card>
      {isBackendConfigured ? (
        <Conversation key={threadId} threadId={threadId} postId={postId} />
      ) : (
        <Box padding={3}>
          <Text size={1} muted>
            Backend URL not configured (SANITY_APP_WEB_URL).
          </Text>
        </Box>
      )}
    </Card>
  )
}
