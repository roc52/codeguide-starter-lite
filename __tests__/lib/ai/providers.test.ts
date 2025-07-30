import { openaiProvider } from '@/lib/ai/providers/openai'
import { anthropicProvider } from '@/lib/ai/providers/anthropic'

// ---------- Mock OpenAI SDK ----------
jest.mock('openai', () => {
  return function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: async () => {
            async function* stream() {
              yield { choices: [{ delta: { content: 'Hello ' } }] }
              yield { choices: [{ delta: { content: 'World' } }] }
            }
            return stream()
          },
        },
      },
    }
  }
})

// ---------- Mock Anthropic SDK ----------
jest.mock(
  'anthropic',
  () => {
    return function MockAnthropic() {
      return {
        messages: {
          stream: async () => {
            async function* stream() {
              yield {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: 'Foo ' },
              }
              yield {
                type: 'content_block_delta',
                delta: { type: 'text_delta', text: 'Bar' },
              }
            }
            return stream()
          },
        },
      }
    }
  },
  { virtual: true },
)

describe('LLM providers streaming', () => {
  it('openaiProvider.chatStream yields tokens in order', async () => {
    const gen = openaiProvider.chatStream({
      messages: [
        { role: 'user', content: 'Say hello' },
      ],
      userApiKey: 'test',
    })

    const chunks: string[] = []
    for await (const part of gen) {
      chunks.push(part)
    }

    expect(chunks).toEqual(['Hello ', 'World'])
  })

  it('anthropicProvider.chatStream yields tokens in order', async () => {
    const gen = anthropicProvider.chatStream({
      messages: [
        { role: 'user', content: 'Say foo bar' },
      ],
      userApiKey: 'test',
    })

    const chunks: string[] = []
    for await (const part of gen) {
      chunks.push(part)
    }

    expect(chunks).toEqual(['Foo ', 'Bar'])
  })
})
