import {SparklesIcon} from '@sanity/icons/Sparkles'
import {Box, Button, Card, Dialog, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {editDocument, useApplyDocumentActions, type DocumentHandle} from '@sanity/sdk-react'
import type {GenerateCaptionRequest, GenerateCaptionResponse} from '@social-studio/shared'
import {useState} from 'react'

import {BackendError, errorMessage, isBackendConfigured, useBackend} from '../../lib/backend'

/**
 * "Draft with AI": Content Agent writes a caption and hashtags from the post, its campaign and the
 * client's brand guidelines. The suggestion is shown first; "Use this" puts it in the editor as an
 * unsaved change, like typing it.
 */
const PRESETS: {label: string; brief: string}[] = [
  {label: 'Shorter', brief: 'Rewrite it shorter: two or three sentences, same message.'},
  {label: 'Alternative angle', brief: 'Write an alternative caption with a different angle from the current one.'},
  {label: 'Adapt for Reel', brief: 'Adapt for a Reel: a one-line hook first, then one short paragraph.'},
  {label: 'Hashtags focus', brief: 'Keep the caption close to the current one and focus on better, more specific hashtags.'},
]

export function CaptionAssist({handle}: {handle: DocumentHandle}) {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestion, setSuggestion] = useState<GenerateCaptionResponse | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const request = useBackend()
  const apply = useApplyDocumentActions()

  const generate = async () => {
    setBusy(true)
    setFailure(null)
    try {
      const body: GenerateCaptionRequest = brief.trim() ? {brief: brief.trim()} : {}
      setSuggestion(
        await request<GenerateCaptionResponse>(`/api/posts/${encodeURIComponent(handle.documentId)}/caption`, {method: 'POST', body}),
      )
    } catch (error) {
      setFailure(error instanceof BackendError && error.code === 'ai_not_configured' ? `Content Agent is not set up: ${error.message}` : errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const use = async () => {
    if (!suggestion) return
    await apply(editDocument(handle, {set: {caption: suggestion.caption, hashtags: suggestion.hashtags}}))
    setOpen(false)
    setSuggestion(null)
  }

  const close = () => {
    if (busy) return
    setOpen(false)
    setSuggestion(null)
    setFailure(null)
  }

  return (
    <>
      <Flex justify="flex-end">
        <Button
          mode="ghost"
          icon={SparklesIcon}
          text="Draft with AI"
          fontSize={1}
          padding={2}
          disabled={!isBackendConfigured}
          title={isBackendConfigured ? undefined : 'Backend URL not configured (SANITY_APP_WEB_URL).'}
          onClick={() => setOpen(true)}
        />
      </Flex>
      {open && (
        <Dialog
          id="caption-assist"
          header="Draft caption with AI"
          width={1}
          onClose={close}
          footer={
            <Flex justify="flex-end" gap={2} padding={3}>
              <Button mode="bleed" text="Cancel" fontSize={1} padding={2} disabled={busy} onClick={close} />
              {suggestion ? (
                <>
                  <Button mode="ghost" text="Try again" fontSize={1} padding={2} loading={busy} onClick={() => void generate()} />
                  <Button tone="primary" text="Use this" fontSize={1} padding={2} disabled={busy} onClick={() => void use()} />
                </>
              ) : (
                <Button tone="primary" icon={SparklesIcon} text="Generate" fontSize={1} padding={2} loading={busy} onClick={() => void generate()} />
              )}
            </Flex>
          }
        >
          <Stack gap={4} padding={4}>
            <Text size={1} muted>
              Content Agent reads this post, its campaign (objective, audience, key messages) and the client’s brand guidelines
              (voice, pillars, words to use and avoid, calls to action). A draft takes about half a minute and uses AI credits.
            </Text>
            <Stack gap={2}>
              <Text as="label" htmlFor="caption-brief" size={1} weight="medium">
                Direction (optional)
              </Text>
              <Flex gap={1} wrap="wrap">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    mode={brief === preset.brief ? 'default' : 'ghost'}
                    tone={brief === preset.brief ? 'primary' : 'default'}
                    text={preset.label}
                    fontSize={1}
                    padding={2}
                    disabled={busy}
                    onClick={() => setBrief(brief === preset.brief ? '' : preset.brief)}
                  />
                ))}
              </Flex>
              <TextInput
                id="caption-brief"
                fontSize={1}
                padding={3}
                placeholder="e.g. playful, mention the launch on Friday"
                value={brief}
                maxLength={500}
                onChange={(event) => setBrief(event.currentTarget.value)}
              />
            </Stack>
            {failure && (
              <Card tone="critical" border radius={2} padding={3}>
                <Text size={1}>{failure}</Text>
              </Card>
            )}
            {suggestion && (
              <Card border radius={2} padding={3} tone="transparent">
                <Stack gap={3}>
                  <Text size={1} style={{whiteSpace: 'pre-wrap'}}>
                    {suggestion.caption}
                  </Text>
                  {suggestion.hashtags.length > 0 && (
                    <Box>
                      <Text size={1} muted>
                        {suggestion.hashtags.map((tag) => `#${tag}`).join(' ')}
                      </Text>
                    </Box>
                  )}
                  <Text size={0} muted>
                    Replaces the current caption and hashtags. Nothing is saved until you save the post.
                  </Text>
                </Stack>
              </Card>
            )}
          </Stack>
        </Dialog>
      )}
    </>
  )
}
