"use client"

import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { ChatMessage } from '@/lib/ai/types'
import { useChatStream } from '@/hooks/use-chat-stream'
import { MessageBubble } from './MessageBubble'

interface ChatWindowProps {
  conversationId: string
  provider: string
  model: string
  initialMessages: ChatMessage[]
}

export function ChatWindow({
  conversationId,
  provider,
  model,
  initialMessages,
}: ChatWindowProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
  } = useChatStream({ conversationId, provider, model, initialMessages })

  const bottomRef = useRef<HTMLDivElement | null>(null)

  // scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage()
        }}
        className="flex border-t bg-background p-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="mr-2 flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
