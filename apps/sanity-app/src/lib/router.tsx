import {useNavigate} from '@sanity/sdk-react/dashboard'
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react'

export type ClientTab = 'general' | 'brand' | 'social' | 'campaigns' | 'content'
export type CalendarView = 'month' | 'week'

export type Route =
  | {name: 'dashboard'}
  | {name: 'calendar'; view: CalendarView; date?: string}
  | {name: 'content'; status?: string}
  | {name: 'post'; id: string}
  | {name: 'campaigns'}
  | {name: 'campaign'; id: string}
  | {name: 'clients'}
  | {name: 'client'; id: string; tab: ClientTab}
  | {name: 'media'}
  | {name: 'analytics'}
  | {name: 'ai'}
  | {name: 'settings'}

export type RouteName = Route['name']

const CLIENT_TABS: readonly ClientTab[] = ['general', 'brand', 'social', 'campaigns', 'content']

export function parsePath(input: string): Route {
  const [pathPart = '', queryPart = ''] = input.replace(/^\/+/, '').split('?')
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent)
  const query = new URLSearchParams(queryPart)
  const [first, second, third] = segments

  switch (first) {
    case 'calendar':
      return {
        name: 'calendar',
        view: second === 'week' ? 'week' : 'month',
        date: query.get('date') ?? undefined,
      }
    case 'content':
      return second ? {name: 'post', id: second} : {name: 'content', status: query.get('status') ?? undefined}
    case 'campaigns':
      return second ? {name: 'campaign', id: second} : {name: 'campaigns'}
    case 'clients': {
      if (!second) return {name: 'clients'}
      const tab = CLIENT_TABS.find((candidate) => candidate === third) ?? 'general'
      return {name: 'client', id: second, tab}
    }
    case 'media':
    case 'analytics':
    case 'ai':
    case 'settings':
      return {name: first}
    default:
      return {name: 'dashboard'}
  }
}

export function toPath(route: Route): string {
  const enc = encodeURIComponent
  switch (route.name) {
    case 'dashboard':
      return ''
    case 'calendar':
      return `calendar/${route.view}${route.date ? `?date=${enc(route.date)}` : ''}`
    case 'content':
      return `content${route.status ? `?status=${enc(route.status)}` : ''}`
    case 'post':
      return `content/${enc(route.id)}`
    case 'campaigns':
      return 'campaigns'
    case 'campaign':
      return `campaigns/${enc(route.id)}`
    case 'clients':
      return 'clients'
    case 'client':
      return `clients/${enc(route.id)}/${route.tab}`
    default:
      return route.name
  }
}

interface RouterValue {
  route: Route
  navigate: (route: Route) => void
}

const RouterContext = createContext<RouterValue | null>(null)

/**
 * A small router kept in sync with the Dashboard URL: Dashboard navigations (back/forward, deep
 * links) update the route, and in-app navigations are reported back to the Dashboard.
 */
export function RouterProvider({children}: {children: ReactNode}) {
  const [route, setRoute] = useState<Route>({name: 'dashboard'})
  const reportNavigation = useNavigate(({path}) => setRoute(parsePath(path)))

  const navigate = useCallback(
    (next: Route) => {
      setRoute(next)
      reportNavigation({path: toPath(next)})
    },
    [reportNavigation],
  )

  const value = useMemo(() => ({route, navigate}), [route, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRouter must be used inside RouterProvider')
  return value
}
