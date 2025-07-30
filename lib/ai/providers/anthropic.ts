import Anthropic from 'anthropic'

import type { ChatStreamParams, LLMProvider } from '../types'

// Anthropic (Claude) streaming API yields text deltas inside SSE events.
// The official SDK normalises this into an async iterable of `Message`
// objects where the `delta` field contains the incremental text.

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

export const anthropicProvider: LLMProvider = {
  name: 'anthropic',
  defaultModel: 'claude-3-haiku-20240307',
  maxTokens: 200_000, // Claude 3 context window upper bound

  async *chatStream({ messages, model, userApiKey, signal }: ChatStreamParams) {
    const apiKey = userApiKey ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    const client = createClient(apiKey)

    const stream = await client.messages.stream({
      model: model ?? this.defaultModel,
      max_tokens: 4_096, // caller may override in future
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: true,
      signal,
    })

    for await (const delta of stream) {
      if (delta.type === 'content_block_delta' && delta.delta.type === 'text_delta') {
        yield delta.delta.text
      }
    }
  },
}
