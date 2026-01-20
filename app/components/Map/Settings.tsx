import { Fragment, useState } from 'react'
import cn from 'classnames'
import GearIcon from '@/app/img/gear.svg'
import XIcon from '@/app/img/x.svg'
import { useSettings } from '@/app/providers/settings'
import {
  Settings,
  MapStyle,
  ColorMode,
  Units,
  TimeFormat,
  TimeZone,
  SettingConfig,
} from '@/app/types'
import Image from 'next/image'
import { classNames } from '@/app/constants'

interface MapSettingsProps {
  style?: React.CSSProperties
}

function MapSettings({ style = {} }: MapSettingsProps) {
  const [open, setOpen] = useState(false)
  const { settings, updateSetting } = useSettings()

  const mapStyleOptions: { value: MapStyle; label: string }[] = [
    { value: 'gray', label: 'Gray' },
    { value: 'simple', label: 'Simple' },
    { value: 'detailed', label: 'Detailed' },
  ]

  const mapStyleImages: Record<MapStyle, string> = {
    gray: 'positron',
    simple: 'bright',
    detailed: 'liberty',
  }

  const colorModeOptions: { value: ColorMode; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  const unitsOptions: { value: Units; label: string }[] = [
    { value: 'miles', label: 'Miles' },
    { value: 'kilometers', label: 'Kilometers' },
  ]

  const timeFormatOptions: { value: TimeFormat; label: string }[] = [
    { value: 'hr12', label: '12-hour' },
    { value: 'hr24', label: '24-hour' },
  ]

  const timeZoneOptions: { value: TimeZone; label: string }[] = [
    { value: 'local', label: 'Stations’ time zones' },
    { value: 'device', label: 'Your time zone' },
  ]

  const settingsConfig: SettingConfig[] = [
    {
      label: 'Map style',
      key: 'mapStyle' as const,
      options: mapStyleOptions,
      value: settings.mapStyle,
      wrap: false,
      customUI: (option, isSelected, onChange) => (
        <div>
          <label
            className={cn(
              'block cursor-pointer rounded-lg border-2 shadow-md',
              isSelected
                ? 'border-amtrak-blue-400 ring-amtrak-blue-400 ring'
                : 'border-white dark:border-black',
            )}
          >
            <input
              type="radio"
              name="mapStyle"
              // `settings.follow` is a boolean, but it is not rendered in MapSettings.
              // all values shown here should be strings
              value={option.value as string}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <Image
              src={`/img/map_style/${mapStyleImages[option.value as MapStyle]}.png`}
              alt={option.label}
              width={64}
              height={64}
              quality={100}
              className="rounded-md dark:hue-rotate-180 dark:invert"
            />
          </label>
          <div
            className={cn(
              'my-1 text-center text-sm',
              classNames.textDeemphasized,
            )}
          >
            {option.label}
          </div>
        </div>
      ),
    },
    {
      label: 'Color theme',
      key: 'colorMode' as const,
      options: colorModeOptions,
      value: settings.colorMode,
      wrap: true,
    },
    {
      label: 'Units',
      key: 'units' as const,
      options: unitsOptions,
      value: settings.units,
      wrap: true,
    },
    {
      label: 'Time format',
      key: 'timeFormat' as const,
      options: timeFormatOptions,
      value: settings.timeFormat,
      wrap: true,
    },
    {
      label: 'Show times in',
      key: 'timeZone' as const,
      options: timeZoneOptions,
      value: settings.timeZone,
      wrap: true,
    },
  ]

  const renderRadioGroup = <T extends keyof Settings>(config: {
    label: string
    key: T
    options: { value: Settings[T]; label: string }[]
    value: Settings[T]
    wrap: boolean
    customUI?: (
      _option: { value: Settings[T]; label: string },
      _isSelected: boolean,
      _onChange: (_value: Settings[T]) => void,
    ) => React.ReactNode
  }) => (
    <Fragment key={config.key}>
      <span className="font-semibold">{config.label}</span>
      <div className={cn('flex gap-x-3', { 'flex-wrap': config.wrap })}>
        {config.options.map((option) => {
          const isSelected = config.value === option.value
          const handleChange = (value: Settings[T]) =>
            updateSetting(config.key, value)

          if (config.customUI) {
            return (
              <div key={String(option.value)}>
                {config.customUI(option, isSelected, handleChange)}
              </div>
            )
          }

          return (
            <label key={String(option.value)} className="flex items-center">
              <input
                type="radio"
                name={config.key}
                value={String(option.value)}
                checked={isSelected}
                onChange={(e) =>
                  updateSetting(config.key, e.target.value as Settings[T])
                }
                className="mr-1"
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    </Fragment>
  )

  const renderSettings = () => (
    <div className="dark:bg-positron-gray-700 mb-1 grid max-w-full grid-cols-[max-content_minmax(0,1fr)] gap-2 rounded-md bg-white p-4 shadow-md dark:text-white">
      {settingsConfig.map((config) => renderRadioGroup(config))}
    </div>
  )

  return (
    <div className="absolute bottom-0 left-0 z-1 m-2" style={style}>
      {open && renderSettings()}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold shadow-md',
          open
            ? 'bg-amtrak-red-500 text-white'
            : 'dark:bg-positron-gray-700 bg-white dark:text-white',
        )}
      >
        {open ? (
          <XIcon className="w-4 fill-white" alt="Close" />
        ) : (
          <GearIcon className="w-4 dark:fill-white" />
        )}
        Settings
      </button>
    </div>
  )
}

export default MapSettings
