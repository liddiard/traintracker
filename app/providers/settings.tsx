'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react'
import * as cookie from 'cookie'
import { Settings } from '../types'
import {
  SETTINGS_COOKIE_NAME,
  settingOptions,
  defaultSettings,
} from '../constants'

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
})

interface SettingsProviderProps {
  children: ReactNode
  initialSettings: Settings
}

export function SettingsProvider({
  children,
  initialSettings,
}: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const { colorMode } = settings

  // Ref for debouncing cookie writes
  const cookieTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // keep dark/light class name in sync with setting + current system
  // preference (if "auto")
  useEffect(() => {
    const { classList } = document.documentElement
    // clear existing color theme class names
    settingOptions.colorMode.forEach((c) => classList.remove(c))
    if (
      colorMode === 'dark' ||
      (colorMode === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      classList.add('dark')
    } else {
      classList.add('light')
    }
  }, [colorMode])

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prevSettings) => {
        // Early exit if value is unchanged
        if (prevSettings[key] === value) {
          return prevSettings
        }

        const newSettings = { ...prevSettings, [key]: value }

        if (typeof window === 'undefined') {
          return newSettings
        }

        // Debounce cookie persistence (100ms) to avoid blocking main thread
        if (cookieTimeoutRef.current) {
          clearTimeout(cookieTimeoutRef.current)
        }
        cookieTimeoutRef.current = setTimeout(() => {
          try {
            const cookieString = cookie.serialize(
              SETTINGS_COOKIE_NAME,
              JSON.stringify(newSettings),
              {
                path: '/',
                maxAge: 365 * 24 * 60 * 60, // 1 year
              },
            )
            document.cookie = cookieString
          } catch (error) {
            console.warn('Failed to save settings to cookies:', error)
          }
        }, 100)

        return newSettings
      })
    },
    [],
  )

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ settings, updateSetting }),
    [settings, updateSetting],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
