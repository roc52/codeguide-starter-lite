import type { SupabaseClient } from '@supabase/supabase-js'

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface Conversation {
  id: string
  user_id: string | null
  title: string | null
  provider: string
  model: string
  created_at: string | null
  updated_at: string | null
}

export interface Message {
  id: string
  conversation_id: string
  role: ChatRole
  content: string
  token_count: number | null
  created_at: string | null
}

/**
* Insert a new chat message.
*/
export async function insertMessage(
  client: SupabaseClient<any>,
  data: Omit<Message, 'id' | 'created_at'>,
) {
  return client
    .from('messages')
    .insert(data)
    .select()
    .single()
}

/**
* List all conversations that belong to the current authenticated user (RLS enforced).
*/
export async function listConversationsByUser(
  client: SupabaseClient<any>,
) {
  return client
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
}

// ---------------------------------------------------------------------------
// Additional helpers used by the chat UI / API route
// ---------------------------------------------------------------------------

/**
* Create a conversation. When called from the browser the RLS policy will
* automatically fill `user_id` with the subject claim from the JWT.
*/
export async function createConversation(
  client: SupabaseClient<any>,
  data: Omit<Conversation, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
    user_id?: string | null
  },
) {
  return client
    .from('conversations')
    .insert(data)
    .select('*')
    .single()
}

/**
* Return messages for a conversation ordered ascending so the caller can render
* them top-to-bottom.
*/
export async function listMessagesByConversation(
  client: SupabaseClient<any>,
  conversationId: string,
) {
  return client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
}

/**
* Rough equivalent of `touch` – updates the `updated_at` column to the current
* timestamp without altering any other data.
*/
export async function touchConversation(
  client: SupabaseClient<any>,
  conversationId: string,
) {
  return client
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

// ---------------------------------------------------------------------------
// User-scoped API key helpers (Milestone 5)
// ---------------------------------------------------------------------------

export type ProviderId = 'openai' | 'anthropic'

export interface UserApiKey {
  user_id: string
  provider: ProviderId
  api_key_encrypted: string
}

/**
* Return the *plain* API key for the given provider that belongs to the
* currently authenticated user (RLS enforced).
*/
export async function getUserApiKey(
  client: SupabaseClient<any>,
  provider: ProviderId,
) {
  return client
    .from('user_api_keys')
    .select('api_key_encrypted')
    .eq('provider', provider)
    .maybeSingle()
}

/**
* Upsert a user-scoped API key. The table (DDL) is expected to have a
* composite unique constraint on `(user_id, provider)` so that `upsert` does
* the right thing.
*/
export async function upsertUserApiKey(
  client: SupabaseClient<any>,
  provider: ProviderId,
  apiKey: string,
) {
  return client
    .from('user_api_keys')
    .upsert(
      {
        provider,
        api_key_encrypted: apiKey,
      },
      {
        onConflict: 'user_id,provider',
      },
    )
    .select('*')
    .single()
}

