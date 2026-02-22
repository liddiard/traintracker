import Link from 'next/link'
import cn from 'classnames'
import { classNames, inter, pageMetadata } from '@/app/constants'

import '@/app/globals.css'
import '@/app/app.css'
import { getServerSettings } from '@/app/settings'
import { SettingsProvider } from '@/app/providers/settings'

export const metadata = pageMetadata

export default async function ContentLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const settings = await getServerSettings()

  return (
    <html lang="en">
      <body
        className={cn(
          inter.className,
          'dark:bg-positron-gray-800 flex min-h-screen flex-col dark:text-white',
        )}
      >
        <SettingsProvider initialSettings={settings}>
          <header className="bg-amtrak-midnight-blue text-white shadow-md">
            <div className="mx-auto flex max-w-xl items-center justify-between p-4">
              <Link href="/" className="text-2xl font-bold text-white">
                Train<span className="text-amtrak-blue-300">Tracker</span>
              </Link>
              <nav className="flex items-center gap-3 font-medium text-white sm:gap-5">
                <Link href="/">Map</Link>
                {/* Shorten link name on mobile to prevent text wrapping */}
                <Link href="/gear-guide" className="xs:hidden">
                  Gear
                </Link>
                <Link href="/gear-guide" className="xs:block hidden">
                  Gear Guide
                </Link>
                <Link href="/about">About</Link>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-xl flex-1 px-4 py-8">{children}</main>

          <footer className="bg-positron-gray-100 dark:bg-positron-gray-900">
            <div
              className={cn(
                'mx-auto flex max-w-xl items-center justify-between p-4 text-center text-sm',
                classNames.textDeemphasized,
              )}
            >
              <p>&copy; {new Date().getFullYear()} TrainTracker</p>
              <nav className="flex items-center gap-3 underline sm:gap-4">
                <Link href="/privacy">Privacy Policy</Link>
              </nav>
            </div>
          </footer>
        </SettingsProvider>
      </body>
    </html>
  )
}
