import { cookies, headers } from 'next/headers'
import {
  defaultSettings,
  settingOptions,
  SETTINGS_COOKIE_NAME,
} from './constants'
import { Settings } from './types'

/**
 * Returns locale-aware defaults for units and timeFormat based on the
 * Accept-Language request header. Defaults to miles + 12-hour time for US
 * locales, kilometers + 24-hour for all others.
 */
async function getLocaleDefaults(): Promise<
  Pick<Settings, 'units' | 'timeFormat'>
> {
  try {
    const headerStore = await headers()
    const acceptLanguage = headerStore.get('accept-language')
    if (acceptLanguage) {
      const primaryLocale = acceptLanguage.split(',')[0].split(';')[0].trim()
      const { region } = new Intl.Locale(primaryLocale)
      if (region === 'US') {
        return { units: 'miles', timeFormat: 'hr12' }
      }
    }
  } catch {
    // fall through to non-US defaults
  }
  return { units: 'kilometers', timeFormat: 'hr24' }
}

/**
 * Retrieves user settings from cookies on the server side.
 *
 * This function should only be called from Server Components or Server Actions.
 * It reads the settings cookie and validates each setting value. If the settings
 * don't exist or can't be parsed, returns the default settings.
 *
 * @returns {Settings} A validated settings object
 */
export async function getServerSettings(): Promise<Settings> {
  const cookieStore = await cookies()
  const settingsCookie = cookieStore.get(SETTINGS_COOKIE_NAME)

  if (!settingsCookie?.value) {
    return { ...defaultSettings, ...(await getLocaleDefaults()) }
  }

  let parsedSettings: Settings
  try {
    parsedSettings = JSON.parse(settingsCookie.value)
    if (typeof parsedSettings !== 'object' || parsedSettings === null) {
      throw Error('Cookie settings is not an object')
    }
  } catch (error) {
    console.warn('Failed to parse settings from cookie, using defaults:', error)
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
