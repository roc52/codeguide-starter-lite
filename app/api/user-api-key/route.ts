import { z } from 'zod'

import { getUserApiKey, upsertUserApiKey, ProviderId } from '@/utils/supabase/db'
import { createClerkSupabaseClientSsr } from '@/utils/supabase/server'
import { auth } from '@clerk/nextjs/server'

export const runtime = 'edge'

/* ---------------------------------------------------------------------------
* Helpers
* -------------------------------------------------------------------------*/

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

/* ---------------------------------------------------------------------------
* GET – return user API keys (masked)
* -------------------------------------------------------------------------*/

export async function GET(req: Request): Promise<Response> {
  const { userId } = await auth()
  if (!userId) {
    return jsonResponse({ error: 'unauthenticated' }, { status: 401 })
  }

  const url = new URL(req.url)
  const provider = url.searchParams.get('provider') as ProviderId | null

  const supabase = await createClerkSupabaseClientSsr()

  if (provider) {
    const { data, error } = await getUserApiKey(supabase, provider)
    if (error) return jsonResponse({ error: error.message }, { status: 500 })
    return jsonResponse({ provider, apiKey: data?.api_key_encrypted ?? null })
  }

  // Return all providers
  const { data, error } = await supabase.from('user_api_keys').select('provider, api_key_encrypted')
  if (error) return jsonResponse({ error: error.message }, { status: 500 })

  return jsonResponse({ keys: data })
}

/* ---------------------------------------------------------------------------
* POST – upsert user API key
* -------------------------------------------------------------------------*/

const UpsertSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string().min(10),
})

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth()
  if (!userId) {
    return jsonResponse({ error: 'unauthenticated' }, { status: 401 })
  }

  let payload: z.infer<typeof UpsertSchema>
  try {
    payload = UpsertSchema.parse(await req.json())
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const supabase = await createClerkSupabaseClientSsr()

  const { error } = await upsertUserApiKey(supabase, payload.provider, payload.apiKey)
  if (error) return jsonResponse({ error: error.message }, { status: 500 })

  return jsonResponse({ ok: true })
}
