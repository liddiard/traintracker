'use client'

import { useState, useEffect, useMemo } from 'react'
import cn from 'classnames'
import { useNotifications } from '@/app/components/hooks'
import { useTrains } from '@/app/providers/train'
import type { NotificationType } from '@/app/types'
import Bell from '@/app/img/bell.svg'
import NotificationDialog from './NotificationDialog'
import { MAX_PUSH_SUBSCRIPTIONS } from '../constants'
import { useBottomSheet } from '../providers/bottomSheet'

interface NotificationButtonProps {
  trainId: string
  stopCode: string
  stopName: string
  hasDeparted: boolean
  activeSubscriptions: Set<string>
  onSubscriptionChange: (
    stopCode: string,
    notificationType: NotificationType,
    isSubscribed: boolean,
  ) => void
}

export default function NotificationButton({
  trainId,
  stopCode,
  stopName,
  hasDeparted,
  activeSubscriptions,
  onSubscriptionChange,
}: NotificationButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { trains } = useTrains()
  const { setPosition } = useBottomSheet()
  const train = useMemo(
    () => trains.find((t) => t.id === trainId),
    [trains, trainId],
  )
  const { permission, isSupported, requestPermission, subscribe, unsubscribe } =
    useNotifications()

  // set mounted state after hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // don't show bell until after hydration, or if train has departed the station, or
  // notifications not supported, or train not found
  if (!mounted || hasDeparted || !isSupported || !train) return null

  const handleClick = () => {
    setShowDialog(true)
    setPosition('top') // fully open bottom sheet as modal is rendered inside of it
  }

  const handleSubscribe = async (type: NotificationType) => {
    const subKey = `${stopCode}-${type}`

    // If already subscribed, unsubscribe
    if (activeSubscriptions.has(subKey)) {
      await unsubscribe(trainId, stopCode, type)
      onSubscriptionChange(stopCode, type, false)
      return
    }

    // Request permission if needed
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        alert(
          '⚠️ Alert not set. You must allow notifications for this site to receive alerts.',
        )
        return
      }
    }

    // Subscribe
    try {
      await subscribe(trainId, stopCode, type)
      onSubscriptionChange(stopCode, type, true)
    } catch (error: any) {
      if (error.message?.includes('Maximum')) {
        alert(
          `⚠️ You have reached the maximum of ${MAX_PUSH_SUBSCRIPTIONS} active notifications. Remove a different alert to set this one.`,
        )
      } else {
        alert('⚠️ Failed to set notification.')
      }
    }
  }

  const hasSubscription =
    activeSubscriptions.has(`${stopCode}-arrival`) ||
    activeSubscriptions.has(`${stopCode}-departure`)
  const actionText = hasSubscription ? 'Manage notifications' : 'Get notified'

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'hover:bg-positron-gray-400/15 cursor-pointer rounded p-1 transition-colors',
          hasSubscription
            ? 'text-amtrak-yellow-300 dark:text-amtrak-yellow-200'
            : 'text-positron-gray-400',
        )}
        title={actionText}
        aria-label={`${actionText} for ${stopName}`}
      >
        <Bell className="h-4 w-4" />
      </button>

      {showDialog && (
        <NotificationDialog
          stopName={stopName}
          stopCode={stopCode}
          trainId={trainId}
          onClose={() => setShowDialog(false)}
          onSubscribe={handleSubscribe}
          activeSubscriptions={activeSubscriptions}
        />
      )}
    </>
  )
}
