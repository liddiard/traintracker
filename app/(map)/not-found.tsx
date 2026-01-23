import Link from 'next/link'
import cn from 'classnames'
import { classNames } from '@/app/constants'
import ChevronLeft from '@/app/img/chevron-left.svg'

export default function NotFound() {
  return (
    <div className="mx-3 my-6 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <Link href="/" className={cn(classNames.link, classNames.textAccent)}>
        <ChevronLeft className="h-4" />
        Back to Train List
      </Link>
    </div>
  )
}
