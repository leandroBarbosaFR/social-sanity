import {useCreateDocument, useCurrentUser} from '@sanity/sdk-react'
import {useCallback} from 'react'

import {useRouter} from './router'
import {useWorkspace} from './workspace'

export type CreatableType = 'socialPost' | 'campaign' | 'client'

type Initial = Record<string, unknown>

/** Creates a document as a draft and opens it. */
export function useCreateAndOpen() {
  const createPost = useCreateDocument<Initial>({documentType: 'socialPost'})
  const createCampaign = useCreateDocument<Initial>({documentType: 'campaign'})
  const createClient = useCreateDocument<Initial>({documentType: 'client'})
  const {navigate} = useRouter()
  const {clientId} = useWorkspace()
  const user = useCurrentUser()

  return useCallback(
    async (type: CreatableType, initial: Initial = {}) => {
      const clientRef = clientId ? {client: {_type: 'reference', _ref: clientId}} : {}
      switch (type) {
        case 'socialPost': {
          const handle = await createPost({
            title: 'Untitled post',
            platforms: ['instagram'],
            format: 'image',
            workflowStatus: 'idea',
            media: [],
            hashtags: [],
            ...(user ? {createdBy: {_type: 'userStamp', sanityUserId: user.id, name: user.name}} : {}),
            ...clientRef,
            ...initial,
          })
          navigate({name: 'post', id: handle.documentId})
          return handle.documentId
        }
        case 'campaign': {
          const handle = await createCampaign({title: 'Untitled campaign', status: 'planned', ...clientRef, ...initial})
          navigate({name: 'campaign', id: handle.documentId})
          return handle.documentId
        }
        case 'client': {
          const slug = {_type: 'slug', current: `new-client-${Math.random().toString(36).slice(2, 8)}`}
          const handle = await createClient({name: 'New client', slug, status: 'active', primaryLanguage: 'en-GB', ...initial})
          navigate({name: 'client', id: handle.documentId, tab: 'general'})
          return handle.documentId
        }
      }
    },
    [createPost, createCampaign, createClient, clientId, navigate, user],
  )
}
