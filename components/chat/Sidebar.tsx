"use client"

import Link from 'next/link'

import { useEffect, useState } from 'react'

import { listConversationsByUser } from '@/utils/supabase/db'
import { getSupabaseClient } from '@/utils/supabase/client'

interface ConversationListItem {
  id: string
  title: string | null
}

export function Sidebar({ currentId }: { currentId: string }) {
  const [items, setItems] = useState<ConversationListItem[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseClient()
      const { data } = await listConversationsByUser(supabase)
      if (data) {
        setItems(data.map((c) => ({ id: c.id, title: c.title })))
      }
    }
    fetchData()
  }, [])

  return (
    <aside className="w-60 border-r p-4">
      <h2 className="mb-4 text-sm font-medium uppercase text-muted-foreground">Conversations</h2>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/chat/${item.id}`}
              className={
                item.id === currentId
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {item.title ?? 'Untitled'}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
