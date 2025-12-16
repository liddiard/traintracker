'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { Settings } from '../types'

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const settingOptions = {
  mapStyle: ['gray', 'simple', 'detailed'],
  colorMode: ['auto', 'light', 'dark'],
  units: ['miles', 'kilometers'],
  timeFormat: ['12hr', '24hr'],
  timeZone: ['local', 'device'],
}

const defaultSettings: Settings = {
  mapStyle: 'gray',
  colorMode: 'auto',
  units: 'miles',
  timeFormat: '12hr',
  timeZone: 'local',
}

const STORAGE_KEY = 'settings'

/**
 * Retrieves user settings from localStorage.
 *
 * Attempts to load a settings object from localStorage. It validates that
 * each setting has a valid value. If the settings don't exist or can't be
 * parsed, returns the default settings. If any individual setting is invalid,
 * it falls back to the default value for the entire settings object or for
 * that specific setting.
 *
 * @returns {Settings} A validated settings object
 */
const getSettings = (): Settings => {
  const storedSettings =
    typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)
  if (!storedSettings) {
    return defaultSettings
  }
  let parsedSettings: Settings
  try {
    parsedSettings = JSON.parse(storedSettings)
    if (typeof parsedSettings !== 'object' || parsedSettings === null) {
      throw Error('localStorage settings is not an object:', parsedSettings)
    }
  } catch (error) {
    console.warn(
      'Failed to load settings from localStorage, using defaults:',
      error,
    )
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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => getSettings())
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
    // update localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error)
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
