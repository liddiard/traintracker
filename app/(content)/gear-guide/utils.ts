import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import type { BlogPost, BlogPostFrontmatter } from '@/app/types'

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const postsDirectory = path.join(__dirname, 'posts')

/**
 * Validate that frontmatter has all required fields
 */
function isValidFrontmatter(data: unknown): data is BlogPostFrontmatter {
  if (!data || typeof data !== 'object') return false
  const fm = data as Record<string, unknown>
  return (
    typeof fm.title === 'string' &&
    (typeof fm.date === 'string' || fm.date instanceof Date) &&
    typeof fm.description === 'string'
  )
}

/**
 * Get all blog posts, sorted by date (newest first)
 */
export function getAllPosts(): BlogPost[] {
  // Ensure posts directory exists
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith('.md'))

  const posts: BlogPost[] = []

  for (const fileName of fileNames) {
    try {
      const slug = fileName.replace(/\.md$/, '')
      const filePath = path.join(postsDirectory, fileName)
      const fileContent = fs.readFileSync(filePath, 'utf-8')

      const { data, content } = matter(fileContent)

      // Validate frontmatter
      if (!isValidFrontmatter(data)) {
        console.warn(
          `Invalid frontmatter in ${fileName}: missing required fields (title, date, description)`,
        )
        continue
      }

      posts.push({
        slug,
        frontmatter: data,
        content,
      })
    } catch (error) {
      console.error(`Error reading post ${fileName}:`, error)
    }
  }

  // Sort by date, newest first
  posts.sort((a, b) => {
    const dateA = Date.parse(a.frontmatter.date)
    const dateB = Date.parse(b.frontmatter.date)
    return dateB - dateA
  })

  return posts
}

/**
 * Get a single post by slug
 */
export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const filePath = path.join(postsDirectory, `${slug}.md`)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(fileContent)

    // Validate frontmatter
    if (!isValidFrontmatter(data)) {
      console.error(
        `Invalid frontmatter in ${slug}.md: missing required fields`,
      )
      return null
    }

    return {
      slug,
      frontmatter: data,
      content,
    }
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

export const getIsoDateString = (date: Date): string =>
  date.toISOString().split('T')[0]

export const formatPostDate = (date: Date): string =>
  date.toLocaleDateString(Intl.DateTimeFormat().resolvedOptions().locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
