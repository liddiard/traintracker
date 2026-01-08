import { Inter } from 'next/font/google'
import { Settings } from './types'

// minimum completion of the progress bar to avoid display issues with border-radius
export const MIN_PROGRESS_PX = 16

// fields/query params that can be used to search for a train
export const TRAIN_SEARCH_PARAMS = ['from', 'to', 'trainName', 'trainNumber']

// max number of active push notification subscriptions allowed per device
export const MAX_PUSH_SUBSCRIPTIONS = 10

// at this number of pixels wide, switch to 1-column mobile lyout
export const MOBILE_BREAKPOINT = 768

// typeface
export const inter = Inter({ subsets: ['latin'] })

// common groups of class names
export const classNames: Record<string, string> = {
  textDeemphasized: 'text-positron-gray-600 dark:text-positron-gray-300',
  textAccent: 'text-amtrak-blue-500 dark:text-amtrak-blue-300',
  sectionSeparator: 'border-positron-gray-200 dark:border-positron-gray-700',
}

// browser cookie used to store user settings
export const SETTINGS_COOKIE_NAME = 'settings'

export const settingOptions = {
  mapStyle: ['gray', 'simple', 'detailed'],
  colorMode: ['auto', 'light', 'dark'],
  units: ['miles', 'kilometers'],
  timeFormat: ['hr12', 'hr24'],
  timeZone: ['local', 'device'],
  follow: [true, false],
}

export const defaultSettings: Settings = {
  mapStyle: 'gray',
  colorMode: 'auto',
  units: 'miles',
  timeFormat: 'hr12',
  timeZone: 'local',
  follow: false,
}
