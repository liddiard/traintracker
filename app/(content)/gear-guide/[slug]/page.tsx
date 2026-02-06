import { notFound } from 'next/navigation'
import { marked } from 'marked'
import cn from 'classnames'
import {
  getPostBySlug,
  getAllPosts,
  formatPostDate,
  getIsoDateString,
} from '../utils'
import { classNames } from '@/app/constants'
import type { Metadata } from 'next'

interface BlogPostProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: BlogPostProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      type: 'article',
      publishedTime: post.frontmatter.date,
      images: post.frontmatter.image ? [post.frontmatter.image] : undefined,
    },
  }
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return notFound()
  }

  const html = marked.parse(post.content)
  const date = new Date(post.frontmatter.date)

  return (
    <article className="mb-4">
      <h1 className="mb-3 text-4xl leading-12 font-extrabold">
        {post.frontmatter.title}
      </h1>
      <time
        className={cn('mb-8 block', classNames.textDeemphasized)}
        dateTime={getIsoDateString(date)}
      >
        {formatPostDate(date)}
        {post.frontmatter.author && ` • ${post.frontmatter.author}`}
      </time>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="prose dark:prose-invert"
      />
    </article>
  )
}
