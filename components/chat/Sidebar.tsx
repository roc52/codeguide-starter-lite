"use client"

"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  createConversation,
  listConversationsByUser,
} from '@/utils/supabase/db'
import { getSupabaseClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'

interface ConversationListItem {
  id: string
  title: string | null
}

export function Sidebar({ currentId }: { currentId: string }) {
  const [items, setItems] = useState<ConversationListItem[]>([])
  const router = useRouter()

  const refreshList = async () => {
    const supabase = getSupabaseClient()
    const { data } = await listConversationsByUser(supabase)
    if (data) {
      setItems(data.map((c) => ({ id: c.id, title: c.title })))
    }
  }

  useEffect(() => {
    refreshList()
  }, [])

  const handleNewConversation = async () => {
    const supabase = getSupabaseClient()
    const { data, error } = await createConversation(supabase, {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      title: 'New chat',
    })
    if (error || !data) {
      console.error('[Sidebar] createConversation error', error)
      return
    }
    await refreshList()
    router.push(`/chat/${data.id}`)
  }

  return (
    <aside className="hidden w-60 flex-col border-r p-4 md:flex">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Conversations
        </h2>
        <Button size="icon" variant="outline" onClick={handleNewConversation}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/chat/${item.id}`}
              className={
                item.id === currentId
                  ? 'block truncate font-medium text-primary'
                  : 'block truncate text-muted-foreground hover:text-foreground'
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
