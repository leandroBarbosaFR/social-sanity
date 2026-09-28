import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react'

const STORAGE_KEY = 'social-studio:client'

interface WorkspaceValue {
  /** The client the workspace is scoped to, or null for all clients. */
  clientId: string | null
  setClientId: (clientId: string | null) => void
  /** Free-text search applied to the content list. */
  search: string
  setSearch: (search: string) => void
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

function readStoredClient(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function WorkspaceProvider({children}: {children: ReactNode}) {
  const [clientId, setClientIdState] = useState<string | null>(readStoredClient)
  const setClientId = useCallback((next: string | null) => {
    setClientIdState(next)
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Remembering the client is a convenience only.
    }
  }, [])
  const [search, setSearch] = useState('')
  const value = useMemo(() => ({clientId, setClientId, search, setSearch}), [clientId, setClientId, search])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return value
}
