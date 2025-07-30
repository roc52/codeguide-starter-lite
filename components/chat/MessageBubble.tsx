"use client"

import { cn } from '@/lib/utils'

import type { ChatMessage } from '@/lib/ai/types'

/**
* Simple chat bubble with left/right alignment based on role.
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
          'max-w-[80%] rounded-lg border px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-muted-foreground rounded-bl-none',
        )}
      >
        {message.content}
        {/* For brevity we skip markdown parsing; can add react-markdown later */}
      </div>
    </div>
  )
}
