'use client'

import cn from 'classnames'
import { classNames } from '@/app/constants'
import NoTrain from '@/app/img/no-train.svg'
import ChevronLeft from '@/app/img/chevron-left.svg'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function NotFound() {
  const { code } = useParams()
  const pClassName = cn('text-center text-balance', classNames.textDeemphasized)
  return (
    <div className="mx-3 my-8 flex flex-col items-center gap-6">
      <NoTrain className="text-positron-gray-400 mx-auto max-w-16" />
      <h1 className="text-center text-2xl font-semibold">Station Not Found</h1>
      {typeof code === 'string' ? (
        <p className={pClassName}>
          We dont’t have info for a station with code{' '}
          <span className="font-bold">{code.toUpperCase()}</span>.
        </p>
      ) : null}
      <Link href="/" className={cn(classNames.link, classNames.textAccent)}>
        <ChevronLeft className="h-4" /> Back to Trains
      </Link>
    </div>
  )
}

export const metadata = {
  title: '404 - Page Not Found',
}
