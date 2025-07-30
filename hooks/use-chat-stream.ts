"use client"

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'

import type { ChatMessage } from '@/lib/ai/types'

interface UseChatStreamOptions {
  conversationId: string
  provider: string
  model: string
  /** Initial messages fetched via RSC */
  initialMessages: ChatMessage[]
}

interface UseChatStreamReturn {
  messages: ChatMessage[]
  input: string
  setInput: (v: string) => void
  sendMessage: () => Promise<void>
  isLoading: boolean
}

interface UserKeyMap {
  openai?: string
  anthropic?: string
}

/**
* Small client-side hook that handles:
* 1. Local optimistic update for the user message.
* 2. Streaming assistant reply token-by-token.
* 3. Scroll anchoring handled by the consumer component.
*/
export function useChatStream({
  conversationId,
  provider,
  model,
  initialMessages,
}: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Cache user-scoped API keys (loaded once per component mount)
  const [userKeys, setUserKeys] = useState<UserKeyMap>({})

  // Prefetch user keys on mount so that subsequent sends include them.
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/user-api-key')
        if (res.ok) {
          const data = await res.json()
          const map: UserKeyMap = {}
          for (const row of data.keys ?? []) {
            map[row.provider as keyof UserKeyMap] = row.api_key_encrypted
          }
          setUserKeys(map)
        }
      } catch (_) {
        // Silently ignore – fallback to project-level key.
      }
    })()
  }, [])

  // keep a ref to avoid stale closure when streaming tokens
  const assistantIndexRef = useRef<number | null>(null)

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    setIsLoading(true)

    const controller = new AbortController()

    const body = {
      messages: [...messages, userMsg].slice(-20), // pass last 20 messages for context (rudimentary)
      conversationId,
      provider,
      model,
      userApiKey: (userKeys as Record<string, string | undefined>)[provider],
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`)
      }

      // Create placeholder assistant message
      const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
      assistantIndexRef.current = messages.length + 1 // after push userMsg
      setMessages((prev) => [...prev, assistantMsg])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) {
          const token = decoder.decode(value)
          setMessages((prev) => {
            if (assistantIndexRef.current === null) return prev
            const next = [...prev]
            const idx = assistantIndexRef.current
            next[idx] = {
              ...next[idx],
              content: next[idx].content + token,
            }
            return next
          })
        }
        done = readerDone
      }
    } catch (err) {
      console.error('[useChatStream] sendMessage error', err)
    } finally {
      setIsLoading(false)
      assistantIndexRef.current = null
    }
  }, [conversationId, provider, model, input, messages, isLoading])

  return useMemo(() => ({ messages, input, setInput, sendMessage, isLoading }), [messages, input, sendMessage, isLoading])
}
