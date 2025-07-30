
/**
* A portable message structure shared by all LLM providers.
* We intentionally align the `role` field with OpenAI / Anthropic nomenclature
* so that callers can pass the same array to any concrete provider implementation.
*/
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  /** Raw content of the message. Markdown is allowed. */
  content: string
}

/**
* Common parameters accepted by every provider when initiating a streaming chat
* completion request.
*/
export interface ChatStreamParams {
  /** Ordered message list that forms the chat context. */
  messages: ChatMessage[]
  /** When absent each provider falls back to its `defaultModel`. */
  model?: string
  /** Optional per-user API key that overrides the project-level key. */
  userApiKey?: string
  /** Abort controller propagated from the caller (e.g. Edge runtime). */
  signal?: AbortSignal
}

/**
* A minimal interface every provider must expose so the rest of the codebase
* can treat them uniformly.
*/
export interface LLMProvider {
  /** Stable identifier used inside the DB (e.g. `conversations.provider`). */
  name: 'openai' | 'anthropic'
  /** Returns an async generator that yields partial tokens as soon as they arrive. */
  chatStream: (params: ChatStreamParams) => AsyncGenerator<string, void, unknown>
  /** Default model used when callers omit the `model` field. */
  defaultModel: string
  /** Hard upper bound of context window (used by token counter / validator). */
  maxTokens: number
}

/**
* Utility helper: convert an internal `ChatMessage` array to the structure
* expected by the OpenAI SDK.
*/
export interface OpenAIChatCompletionMessage {
  role: ChatMessage['role']
  content: string
}

export function toOpenAIMessages(messages: ChatMessage[]): OpenAIChatCompletionMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }))
}
