'use client'

import { Card } from '@/components/ui/Card'
import { Icon, ICONS } from '@/components/ui/Icon'
import { ChatPanel, type ChatApi } from '@/components/inbox/ChatPanel'
import type { ConversationMessages } from '@/lib/inbox/queries'
import { fetchMessages, markRead, sendMessage } from './actions'

const api: ChatApi = {
  send: ({ body, clientId }) => sendMessage({ body, clientId }),
  markRead,
  fetchLatest: (opts) => fetchMessages(opts),
}

export function InboxClient({ teacherName, initial }: { teacherName: string; initial: ConversationMessages }) {
  return (
    <Card className="flex flex-col gap-4 !px-4 sm:!px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 flex-none items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Icon d={ICONS.message} size={24} />
        </span>
        <div className="min-w-0 leading-tight">
          <h2 className="m-0 truncate font-display text-xl font-extrabold">{teacherName}</h2>
          <p className="m-0 text-[14px] font-semibold text-muted">Tin nhắn riêng giữa em và cô/thầy</p>
        </div>
      </div>
      <ChatPanel
        viewerRole="student"
        initial={initial}
        api={api}
        placeholder="Em muốn nhắn với cô/thầy điều gì?"
        className="h-[68dvh] min-h-[420px]"
      />
    </Card>
  )
}
