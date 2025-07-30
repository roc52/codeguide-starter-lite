"use client"

import { cn } from '@/lib/utils'

import type { ChatMessage } from '@/lib/ai/types'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// Local typing indicator (three bouncing dots)
function TypingIndicator() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
    </span>
  )
}

/**
* Chat bubble with left/right alignment.
* - Renders markdown for message content
* - When assistant message is still streaming (empty content) shows typing indicator
*/
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isAssistantTyping = message.role === 'assistant' && message.content.length === 0

  return (
    <div
      className={cn(
        'flex w-full px-4 py-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg border px-3 py-2 text-sm leading-relaxed whitespace-pre-line',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-muted-foreground rounded-bl-none',
        )}
      >
        {isAssistantTyping ? (
          <TypingIndicator />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Ensure links open new tab
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
