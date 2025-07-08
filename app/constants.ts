import { Inter } from 'next/font/google'

export const headingToRotationMap: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

// minimum completion of the progress bar to avoid display issues with border-radius
export const MIN_PROGRESS_PX = 16

export const TRAIN_SEARCH_PARAMS = ['from', 'to', 'trainName', 'trainNumber']

// typeface
export const inter = Inter({ subsets: ['latin'] })

// these color values should match those in globals.css
export const colors: Record<string, string> = {
  'amtrak-blue-400': 'oklch(0.6 0.1056 229.84)',
  'amtrak-blue-500': 'oklch(0.5 0.1056 229.84)',
  'amtrak-blue-600': 'oklch(0.4 0.1056 229.84)',
  'amtrak-red-400': 'oklch(0.6 0.2313 32.91)',
  'amtrak-red-500': 'oklch(0.5 0.2313 32.91)',
  'amtrak-red-600': 'oklch(0.4 0.2313 32.91)',
  'amtrak-yellow-400': 'oklch(0.6 0.1683 81.89)',
  'amtrak-green-400': 'oklch(0.6 0.195 148.63)',
  'amtrak-green-500': 'oklch(0.5 0.195 148.63)',
  'amtrak-deep-blue': 'oklch(0.3419 0.0885 246.29)',
  'positron-gray-600': 'oklch(0.4 0.0079 219.62)',
}

export const classNames: Record<string, string> = {
  textDeemphasized: 'text-positron-gray-600 dark:text-positron-gray-300',
  textAccent: 'text-amtrak-blue-500 dark:text-amtrak-blue-300',
  sectionSeparator: 'border-positron-gray-200 dark:border-positron-gray-700',
}
