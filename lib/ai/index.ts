import { openaiProvider } from './providers/openai'
import { anthropicProvider } from './providers/anthropic'

export const providers = {
  [openaiProvider.name]: openaiProvider,
  [anthropicProvider.name]: anthropicProvider,
}

export type ProviderName = keyof typeof providers

/**
* Retrieve a provider implementation by its name.
* Throws an error if the provider is not registered – helpful during
* incremental rollout when the DB may reference unknown providers.
*/
export function getProvider(name: ProviderName) {
  const provider = providers[name]
  if (!provider) {
    throw new Error(`Unsupported provider: ${name}`)
  }
  return provider
}
