import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { marked } from 'marked'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
}

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function About() {
  const filePath = path.join(__dirname, 'page.md')
  const markdown = fs.readFileSync(filePath, 'utf-8')

  const html = marked.parse(markdown)

  return (
    <article className="prose dark:prose-invert">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
