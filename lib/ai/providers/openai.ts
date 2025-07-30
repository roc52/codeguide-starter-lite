import OpenAI from 'openai'

import type { ChatStreamParams, LLMProvider } from '../types'
import { toOpenAIMessages } from '../types'

// Lazy singleton because the Edge runtime cold-start cost of OpenAI is small,
// but we still want to avoid recreating the client for every request when
// running inside a Node server (e.g. local dev).
function createClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey })
}

export const openaiProvider: LLMProvider = {
  name: 'openai',
  defaultModel: 'gpt-3.5-turbo',
  maxTokens: 16_385, // gpt-4-o context window – safe upper bound

  async *chatStream({ messages, model, userApiKey, signal }: ChatStreamParams) {
    const apiKey = userApiKey ?? process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const client = createClient(apiKey)

    // The OpenAI SDK returns a stream that is iterable with `for await`.
    const stream = await client.chat.completions.create(
      {
        model: model ?? this.defaultModel,
        messages: toOpenAIMessages(messages),
        stream: true,
      },
      { signal },
    )

    for await (const chunk of stream) {
      // https://platform.openai.com/docs/api-reference/chat/streaming
      // Each chunk contains the delta for one choice.
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  },
}
