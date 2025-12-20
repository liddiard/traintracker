'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
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

/**
 * Retrieves user settings from cookies.
 *
 * Attempts to load a settings object from cookies. It validates that
 * each setting has a valid value. If the settings don't exist or can't be
 * parsed, returns the default settings. If any individual setting is invalid,
 * it falls back to the default value for the entire settings object or for
 * that specific setting.
 *
 * @returns {Settings} A validated settings object
 */
const getSettingsFromCookie = (): Settings => {
  if (typeof window === 'undefined') {
    return defaultSettings
  }

  const cookies = cookie.parse(document.cookie)
  const storedSettings = cookies[SETTINGS_COOKIE_NAME]

  if (!storedSettings) {
    return defaultSettings
  }

  let parsedSettings: Settings
  try {
    parsedSettings = JSON.parse(storedSettings)
    if (typeof parsedSettings !== 'object' || parsedSettings === null) {
      throw Error('Cookie settings is not an object:', parsedSettings)
    }
  } catch (error) {
    console.warn('Failed to load settings from cookies, using defaults:', error)
    return defaultSettings
  }

  // Validate that all required settings have valid values, falling back to
  // defaults if not
  return (
    Object.entries(settingOptions) as Array<[keyof Settings, unknown[]]>
  ).reduce(
    (acc, [setting, options]) => ({
      ...acc,
      [setting]: options.includes(parsedSettings[setting])
        ? parsedSettings[setting]
        : defaultSettings[setting],
    }),
    {} as Settings,
  )
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
})

interface SettingsProviderProps {
  children: ReactNode
  initialSettings?: Settings
}

export function SettingsProvider({
  children,
  initialSettings,
}: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(
    () => initialSettings || getSettingsFromCookie(),
  )
  const { colorMode } = settings

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

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    if (typeof window === 'undefined') {
      return
    }
    // update cookie
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
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
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
