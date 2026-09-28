import '@sanity/ui/styles.css'

import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react'
import {createGlobalStyle} from 'styled-components'

const theme = buildTheme()

export type ColorScheme = 'dark' | 'light'

const STORAGE_KEY = 'social-studio:scheme'

const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  body {
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
`

function readStoredScheme(): ColorScheme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

const SchemeContext = createContext<{scheme: ColorScheme; setScheme: (scheme: ColorScheme) => void}>({
  scheme: 'dark',
  setScheme: () => undefined,
})

export function useColorScheme() {
  return useContext(SchemeContext)
}

/** Dark is the primary scheme; light is available from Settings and remembered per browser. */
export function SanityUI({children}: {children: ReactNode}) {
  const [scheme, setSchemeState] = useState<ColorScheme>(readStoredScheme)
  const setScheme = useCallback((next: ColorScheme) => {
    setSchemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice lasts this session.
    }
  }, [])
  const value = useMemo(() => ({scheme, setScheme}), [scheme, setScheme])

  return (
    <SchemeContext.Provider value={value}>
      <GlobalStyle />
      <ThemeProvider theme={theme} scheme={scheme}>
        {children}
      </ThemeProvider>
    </SchemeContext.Provider>
  )
}
