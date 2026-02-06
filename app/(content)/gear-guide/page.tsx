import Link from 'next/link'
import Image from 'next/image'
import cn from 'classnames'
import { formatPostDate, getAllPosts, getIsoDateString } from './utils'
import { classNames } from '@/app/constants'
import type { Metadata } from 'next'
import { get } from 'node:http'

export const metadata: Metadata = {
  title: 'Gear Guide',
  description:
    'Our recommendations for the best train travel gear and accessories',
}

export default async function GearGuidePage() {
  const posts = getAllPosts()

  return (
    <>
      <h1 className="mb-8 text-4xl font-extrabold">Gear Guide</h1>
      <div className="mb-4 flex flex-col gap-8">
        {posts.map((post, index) => {
          const date = new Date(post.frontmatter.date)

          return (
            <article
              key={post.slug}
              className={cn(
                classNames.sectionSeparator,
                index < posts.length - 1 ? 'border-b pb-8' : '',
              )}
            >
              {post.frontmatter.image && (
                <Link href={`/gear-guide/${post.slug}`}>
                  <div className="relative mb-4 h-64 w-full overflow-hidden rounded-lg">
                    <Image
                      src={post.frontmatter.image}
                      alt={post.frontmatter.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>
              )}
              <div className="flex flex-col gap-2">
                <Link href={`/gear-guide/${post.slug}`}>
                  <h2 className="text-2xl font-bold hover:underline">
                    {post.frontmatter.title}
                  </h2>
                </Link>
                <time
                  className={classNames.textDeemphasized}
                  dateTime={getIsoDateString(date)}
                >
                  {formatPostDate(date)}
                </time>
                <p className="text-base">{post.frontmatter.description}</p>
                <Link
                  href={`/gear-guide/${post.slug}`}
                  className="text-amtrak-blue-500 dark:text-amtrak-blue-300 hover:underline"
                >
                  Read more →
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
