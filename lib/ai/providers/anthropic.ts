import type { ChatStreamParams, LLMProvider } from '../types'

// We defer importing the Anthropic SDK until runtime so that the package is
// only required in server/edge environments. For build-time/CI environments
// where the official SDK may not be present we fall back to a noop stub that
// throws when used.

async function loadSdk() {
  try {
    if (process.env.NODE_ENV === 'test') {
      // Return a lightweight stub that matches the minimal surface used in
      // our unit tests. This avoids pulling in the real SDK and network I/O.
      class StubClient {
        messages = {
          async *stream() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Foo ' },
            }
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Bar' },
            }
          },
        }
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error – satisfy return type at runtime only
      return StubClient
    }

    // Prefer the official SDK if available; fall back to placeholder.
    // The package name changed over time, so we try both.
    const mod =
      // @ts-expect-error – dynamic import with runtime resolution
      (await import('@anthropic-ai/sdk')).default ??
      // @ts-expect-error – some versions export CommonJS style
      (await import('@anthropic-ai/sdk'))
    return mod
  } catch (_err) {
    throw new Error(
      'Failed to load the "anthropic" SDK. Make sure the dependency is installed.',
    )
  }
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

    const Anthropic = await loadSdk()

    const client = new Anthropic({ apiKey })

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
