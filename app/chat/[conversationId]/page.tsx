import { notFound } from 'next/navigation'

import { ChatWindow } from '@/components/chat/ChatWindow'
import { Sidebar } from '@/components/chat/Sidebar'
import { getSupabaseClient } from '@/utils/supabase/client'

interface PageProps {
  params: {
    conversationId: string
  }
}

export default async function ChatPage({ params }: PageProps) {
  const supabase = getSupabaseClient()

  // Fetch conversation metadata
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.conversationId)
    .single()

  if (!conversation) {
    notFound()
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: true })

  const initialMessages = (messages ?? []).map(({ role, content }) => ({ role, content }))

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar currentId={params.conversationId} />

      {/* Chat window */}
      <div className="flex-1">
        <ChatWindow
          conversationId={params.conversationId}
          provider={conversation.provider}
          model={conversation.model}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  )
}
