"use client"

import { cn } from '@/lib/utils'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

import type { ChatMessage } from '@/lib/ai/types'

// Dynamically import `react-markdown` to avoid increasing _app.js bundle size
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })
const remarkGfmPromise = import('remark-gfm')
const rehypeHighlightPromise = import('rehype-highlight')

/**
* Simple chat bubble with left/right alignment based on role and markdown
* rendering. Code blocks are syntax-highlighted via `rehype-highlight`.
*/
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full px-4 py-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'prose max-w-[80%] rounded-lg border px-3 py-2 text-sm leading-relaxed dark:prose-invert',
          isUser
            ? 'rounded-br-none bg-primary text-primary-foreground'
            : 'rounded-bl-none bg-muted text-foreground',
        )}
      >
        {message.content === '' && !isUser ? (
          <TypingIndicator />
        ) : (
          <Suspense fallback={<span>{message.content}</span>}>
          {/* @ts-expect-error async loader */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ReactMarkdown
            remarkPlugins={[async () => (await remarkGfmPromise).default] as unknown as []}
            rehypePlugins={[async () => (await rehypeHighlightPromise).default] as unknown as []}
            components={{
              a: ({ node: _node, ...props }) => (
                // eslint-disable-next-line jsx-a11y/anchor-is-valid
                <a
                  {...props}
                  className="text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          </Suspense>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <span className="inline-flex gap-1">
      <Dot delay="0" />
      <Dot delay="150" />
      <Dot delay="300" />
    </span>
  )
}

function Dot({ delay }: { delay: string | number }) {
  return (
    <span
      className="block h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}
