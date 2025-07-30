import { z } from 'zod'
import { providers } from '@/lib/ai'
import { getSupabaseClient } from '@/utils/supabase/client'
import { insertMessage } from '@/utils/supabase/db'

export const runtime = 'edge'

/* ---------------------------------------------------------------------------
* Request body schema
* -------------------------------------------------------------------------*/

const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
})

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  conversationId: z.string().uuid().optional(),
  provider: z.enum(['openai', 'anthropic']),
  model: z.string().optional(),
  // 用户专属 Key，暂未实现存取逻辑，先作为透传字段
  userApiKey: z.string().optional(),
})

type ChatRequest = z.infer<typeof ChatRequestSchema>

/* ---------------------------------------------------------------------------
* Utilities
* -------------------------------------------------------------------------*/

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

/* ---------------------------------------------------------------------------
* POST /api/chat  – Edge Runtime stream endpoint
* -------------------------------------------------------------------------*/

export async function POST(req: Request): Promise<Response> {
  let payload: ChatRequest
  try {
    payload = ChatRequestSchema.parse(await req.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse({ error: err.message }, { status: 400 })
    }
    return jsonResponse({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const provider = providers[payload.provider]
  if (!provider) {
    return jsonResponse({ error: `Unsupported provider: ${payload.provider}` }, { status: 400 })
  }

  // Supabase – create per-request client (Edge-safe)
  const supabase = getSupabaseClient()

  /* -----------------------------------------------------------------------
   * Conversation handling
   * ---------------------------------------------------------------------*/

  let conversationId = payload.conversationId ?? null
  if (!conversationId) {
    // 创建新会话（title 临时取首条 user content 前 20 字符）
    const titleCandidate = payload.messages.find((m) => m.role === 'user')?.content.slice(0, 20) ?? 'New chat'
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        title: titleCandidate,
        provider: payload.provider,
        model: payload.model ?? provider.defaultModel,
      })
      .select('*')
      .single()

    if (error || !conv) {
      console.error('[chat] failed to create conversation', error)
      return jsonResponse({ error: 'Failed to create conversation' }, { status: 500 })
    }
    conversationId = conv.id
  }

  /* -----------------------------------------------------------------------
   * Persist incoming user message (只记最后一条 user 消息即可)
   * ---------------------------------------------------------------------*/

  const lastUserMsg = [...payload.messages].reverse().find((m) => m.role === 'user')
  if (lastUserMsg) {
    await insertMessage(supabase, {
      conversation_id: conversationId,
      role: 'user',
      content: lastUserMsg.content,
      token_count: null,
    })
  }

  /* -----------------------------------------------------------------------
   * Stream tokens from LLM provider ► ReadableStream
   * ---------------------------------------------------------------------*/

  const encoder = new TextEncoder()
  let assistantContent = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const token of provider.chatStream({
          messages: payload.messages,
          model: payload.model,
          userApiKey: payload.userApiKey,
        })) {
          assistantContent += token
          controller.enqueue(encoder.encode(token))
        }

        /* ---------------------------------------------------------------
         * Save assistant reply & update conversation timestamp
         * -------------------------------------------------------------*/
        await insertMessage(supabase, {
          conversation_id: conversationId!,
          role: 'assistant',
          content: assistantContent,
          token_count: null,
        })
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId!)

        controller.close()
      } catch (err) {
        console.error('[chat] streaming error', err)
        controller.error(err as Error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Conversation-Id': conversationId!,
    },
  })
}
