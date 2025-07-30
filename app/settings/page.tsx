"use client"

import { useEffect, useState } from 'react'

interface KeysState {
  openai: string
  anthropic: string
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<KeysState>({ openai: '', anthropic: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing keys once
  useEffect(() => {
    async function fetchKeys() {
      try {
        const res = await fetch('/api/user-api-key')
        if (!res.ok) throw new Error(`failed: ${res.status}`)
        const data = await res.json()
        const map: Record<string, string> = {}
        for (const row of data.keys ?? []) {
          map[row.provider] = row.api_key_encrypted
        }
        setKeys({
          openai: map['openai'] ?? '',
          anthropic: map['anthropic'] ?? '',
        })
      } catch (err) {
        console.error(err)
        setError('无法加载已保存的 API Key')
      } finally {
        setLoading(false)
      }
    }
    fetchKeys()
  }, [])

  async function handleSave(provider: 'openai' | 'anthropic') {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: keys[provider] }),
      })
      if (!res.ok) throw new Error(`failed: ${res.status}`)
    } catch (err) {
      console.error(err)
      setError('保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-gray-500">加载中…</p>
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">
      <h1 className="text-xl font-semibold">个人 API Key 设置</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="openai-key">
            OpenAI API Key
          </label>
          <input
            id="openai-key"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="sk-..."
            value={keys.openai}
            onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
          />
          <button
            className="mt-2 px-3 py-1.5 text-sm bg-black text-white rounded disabled:opacity-50"
            disabled={saving}
            onClick={() => handleSave('openai')}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="anthropic-key">
            Claude (Anthropic) API Key
          </label>
          <input
            id="anthropic-key"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="claude-..."
            value={keys.anthropic}
            onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
          />
          <button
            className="mt-2 px-3 py-1.5 text-sm bg-black text-white rounded disabled:opacity-50"
            disabled={saving}
            onClick={() => handleSave('anthropic')}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
