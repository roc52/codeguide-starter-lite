import { POST } from '@/app/api/chat/route'

// -------------------- Mock AI providers --------------------
jest.mock('@/lib/ai', () => {
  const mockProvider = {
    name: 'openai',
    defaultModel: 'gpt-3.5-turbo',
    maxTokens: 4096,
    chatStream: async function* () {
      yield 'Hello '
      yield 'World'
    },
  }
  return { providers: { openai: mockProvider } }
})

// -------------------- Mock Supabase client --------------------

function createStubFrom() {
  return {
    insert: () => ({ select: () => ({ single: () => ({ data: { id: 'conv-123' }, error: null }) }) }),
    select: () => ({ single: () => ({ data: { id: 'conv-123' }, error: null }) }),
    update: () => ({ eq: () => ({ data: null, error: null }) }),
    order: () => ({ data: [], error: null }),
  }
}

jest.mock('@/utils/supabase/client', () => {
  return {
    getSupabaseClient: () => ({
      from: () => createStubFrom(),
    }),
  }
})

// -------------------- Mock insertMessage --------------------

jest.mock('@/utils/supabase/db', () => {
  return {
    insertMessage: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
})

// Polyfill TextEncoder for Jest (jsdom environment)
// Node's global may not expose it under jsdom
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder } = require('util')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.TextEncoder = TextEncoder
}

if (typeof TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextDecoder } = require('util')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.TextDecoder = TextDecoder
}

// Polyfill ReadableStream for Node < 18 or jsdom env
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ReadableStream } = require('stream/web')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.ReadableStream = ReadableStream
}

// Polyfill Response for older Jest environments
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// Minimal Response polyfill sufficient for current tests
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof Response === 'undefined') {
  class MiniResponse {
    body: any
    headers: Map<string, string>
    status: number
    constructor(body: any, init: any = {}) {
      this.body = body
      const map = new Map(Object.entries(init.headers || {}))
      // Expose Headers-like interface with get()
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.headers = {
        get: (key: string) => map.get(key),
      } as any
      this.status = init.status ?? 200
    }
    async text() {
      if (typeof this.body === 'string') return this.body
      if (this.body && typeof this.body.getReader === 'function') {
        const reader = this.body.getReader()
        const decoder = new (global as any).TextDecoder('utf-8')
        let out = ''
        // eslint-disable-next-line no-constant-condition
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const { done, value } = await reader.read()
          if (done) break
          out += decoder.decode(value, { stream: true })
        }
        return out
      }
      return ''
    }
    clone() {
      return new MiniResponse(this.body, { headers: Object.fromEntries(this.headers), status: this.status })
    }
    // Simplified headers API
    get headersObj() {
      return {
        get: (key: string) => this.headers.get(key),
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Response = MiniResponse
}

describe('Edge chat route', () => {
  it('streams assistant tokens concatenated', async () => {
    const body = {
      messages: [
        { role: 'user', content: 'Say hello' },
      ],
      provider: 'openai',
    }

    // Minimal stub of Request needed by route: only `json()` is used inside handler.
    const req = {
      json: async () => body,
    } as unknown as Request

    const res = await POST(req)

    expect(res.status).toBe(200)

    const text = await res.text()
    expect(text).toBe('Hello World')

    // Should have conversation id header
    expect(res.headers.get('Conversation-Id')).toBe('conv-123')
  })
})
