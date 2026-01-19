'use client'

import cn from 'classnames'
import { useTrains } from '@/app/providers/train'
import { NotificationType } from '../types'
import Arrival from '@/app/img/arrival.svg'
import Departure from '@/app/img/departure.svg'
import BellRinging from '@/app/img/bell-ringing.svg'
import Info from '@/app/img/info.svg'
import { classNames } from '../constants'
import { getTrainMeta } from '../utils'
import { useMemo, useState } from 'react'

interface NotificationDialogProps {
  stopName: string
  stopCode: string
  trainId: string
  onClose: () => void
  onSubscribe: (_type: NotificationType) => void
  activeSubscriptions: Set<string>
}

export default function NotificationDialog({
  stopName,
  stopCode,
  trainId,
  onClose,
  onSubscribe,
  activeSubscriptions,
}: NotificationDialogProps) {
  const { trains } = useTrains()
  const train = useMemo(
    () => trains.find((t) => t.id === trainId),
    [trains, trainId],
  )
  const [permissionRequested, setPermissionRequested] = useState(false)

  if (!train) return null

  const { firstStop, lastStop, curStop } = getTrainMeta(train)
  const isFirstStop = stopCode === firstStop.code
  const isLastStop = stopCode === lastStop.code
  const isCurStop = stopCode === curStop?.code

  const handleSubscribe = (type: NotificationType) => {
    onSubscribe(type)
    if ('Notification' in window && Notification.permission !== 'granted') {
      setPermissionRequested(true)
    }
  }

  const renderSubscriptionOption = (
    type: NotificationType,
    disabled: boolean,
  ) => {
    const isActive = activeSubscriptions.has(`${stopCode}-${type}`)
    const isArrival = type === 'arrival'
    const IconComponent = isArrival ? Arrival : Departure

    return (
      <button
        onClick={() => handleSubscribe(type)}
        disabled={disabled}
        title={disabled ? 'Not available for this stop' : ''}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border-2 px-4 py-3 text-left font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
          isActive
            ? 'border-amtrak-blue-400 bg-amtrak-blue-400/10'
            : 'border-positron-gray-200 dark:border-positron-gray-700',
          { 'hover:border-amtrak-blue-400/50': !disabled },
        )}
      >
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 shrink-0" />
          <span>
            {isArrival ? 'Arrives at' : 'Departs'} {stopName}
          </span>
        </div>
        {isActive ? (
          <div className="text-amtrak-yellow-400 dark:text-amtrak-yellow-200 flex items-center gap-2 text-sm">
            <BellRinging className="inline h-4 w-4" /> <span>Alert set</span>
          </div>
        ) : null}
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="dark:bg-positron-gray-800 mx-4 flex w-full max-w-[400px] flex-col gap-4 rounded-lg bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="leading-relaxed">
          Get a push notification when{' '}
          <span className="font-semibold whitespace-nowrap">
            {train.name} {train.number}
          </span>
           …
        </p>

        <div className="flex flex-col gap-3">
          {renderSubscriptionOption('arrival', isFirstStop || isCurStop)}
          {renderSubscriptionOption('departure', isLastStop)}
        </div>

        {permissionRequested && !activeSubscriptions.size && (
          <p
            className="dark:text-amtrak-blue-300 text-amtrak-blue-500 flex items-center gap-3"
            role="alert"
          >
            <Info className="h-6 w-6 shrink-0" />
            <span>Please allow notifications to receive this alert.</span>
          </p>
        )}

        <div
          className={cn(
            'bg-positron-gray-500/5 rounded p-3 text-sm',
            classNames.textDeemphasized,
          )}
        >
          <strong>Heads up:</strong> Your web browser must be running in the
          background to receive notifications. Don’t rely solely on this to
          catch a train!
        </div>

        <button
          onClick={onClose}
          className="bg-positron-gray-500/10 hover:bg-positron-gray-500/20 w-full cursor-pointer rounded px-4 py-2 font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}
