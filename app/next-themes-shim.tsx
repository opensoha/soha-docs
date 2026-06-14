'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Attribute = 'class' | `data-${string}`

type ThemeProviderProps = {
  attribute?: Attribute | Attribute[]
  children: ReactNode
  defaultTheme?: string
  enableColorScheme?: boolean
  enableSystem?: boolean
  forcedTheme?: string
  storageKey?: string
  themes?: string[]
  value?: Record<string, string>
}

type ThemeContextValue = {
  forcedTheme?: string
  resolvedTheme?: string
  setTheme: (theme: string) => void
  systemTheme?: string
  theme?: string
  themes: string[]
}

const defaultThemes = ['light', 'dark']
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme({
  attribute,
  enableColorScheme,
  resolvedTheme,
  themes,
  value,
}: {
  attribute: Attribute | Attribute[]
  enableColorScheme: boolean
  resolvedTheme?: string
  themes: string[]
  value?: Record<string, string>
}) {
  if (!resolvedTheme || typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const attrs = Array.isArray(attribute) ? attribute : [attribute]
  const resolvedValue = value?.[resolvedTheme] ?? resolvedTheme
  for (const attr of attrs) {
    if (attr === 'class') {
      root.classList.remove(...themes.map((theme) => value?.[theme] ?? theme))
      root.classList.add(resolvedValue)
    } else {
      root.setAttribute(attr, resolvedValue)
    }
  }

  if (enableColorScheme && (resolvedTheme === 'light' || resolvedTheme === 'dark')) {
    root.style.colorScheme = resolvedTheme
  }
}

export function ThemeProvider({
  attribute = 'class',
  children,
  defaultTheme = 'system',
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = 'theme',
  themes = defaultThemes,
  value,
}: ThemeProviderProps) {
  const parent = useContext(ThemeContext)
  const [theme, setThemeState] = useState(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<string | undefined>(undefined)

  useEffect(() => {
    setSystemTheme(getSystemTheme())
    try {
      setThemeState(localStorage.getItem(storageKey) || defaultTheme)
    } catch {
      setThemeState(defaultTheme)
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(getSystemTheme())
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [defaultTheme, storageKey])

  const resolvedTheme = forcedTheme ?? (theme === 'system' && enableSystem ? systemTheme : theme)

  useEffect(() => {
    applyTheme({
      attribute,
      enableColorScheme,
      resolvedTheme,
      themes,
      value,
    })
  }, [attribute, enableColorScheme, resolvedTheme, themes, value])

  const setTheme = useCallback(
    (nextTheme: string) => {
      setThemeState(nextTheme)
      try {
        localStorage.setItem(storageKey, nextTheme)
      } catch {
        // Ignore unavailable storage; the visual theme still updates in memory.
      }
    },
    [storageKey],
  )

  const context = useMemo(
    () => ({
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
      theme,
      themes: enableSystem ? [...themes, 'system'] : themes,
    }),
    [enableSystem, forcedTheme, resolvedTheme, setTheme, systemTheme, theme, themes],
  )

  if (parent) {
    return <>{children}</>
  }

  return <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return (
    useContext(ThemeContext) ?? {
      setTheme: () => {},
      themes: [],
    }
  )
}
