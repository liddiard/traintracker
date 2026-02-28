import cn from 'classnames'
import { classNames } from '@/app/constants'
import NoTrain from '@/app/img/no-train.svg'
import ChevronLeft from '@/app/img/chevron-left.svg'
import Link from 'next/link'

export default function NotFound() {
  const pClassName = cn('text-center text-balance', classNames.textDeemphasized)
  return (
    <div className="mx-3 my-8 flex flex-col items-center gap-4">
      <NoTrain className="text-positron-gray-400 mx-auto max-w-16" />
      <h1 className="text-center text-2xl font-semibold">Train Not Found</h1>
      <p className={pClassName}>
        If you were previously tracking a train, it likely arrived at its final
        destination. TrainTracker only tracks trains that are in transit or
        recently arrived.
      </p>
      <Link href="/" className={cn(classNames.link, classNames.textAccent)}>
        <ChevronLeft className="h-4" /> All Trains
      </Link>
    </div>
  )
}

export const metadata = {
  title: '404 - Page Not Found',
}
