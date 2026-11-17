'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { ChatPanel, type ChatApi } from '@/components/inbox/ChatPanel'
import { useInboxEvents } from '@/components/inbox/InboxProvider'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { formatListTime } from '@/lib/inbox/time'
import {
  conversationStatus,
  filterConversations,
  type ConversationFilter,
  type ConversationSummary,
} from '@/lib/inbox/types'
import type { ConversationMessages, InboxStudent } from '@/lib/inbox/queries'
import { fetchMessages, markRead, sendMessage } from './actions'

type Selected = { studentId: string; name: string; initial: ConversationMessages }

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'waiting', label: 'Chờ phản hồi' },
] as const

export function TeacherInboxClient({
  conversations,
  students,
  selected,
}: {
  conversations: ConversationSummary[]
  students: InboxStudent[]
  selected: Selected | null
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<ConversationFilter>('all')
  const visible = useMemo(() => filterConversations(conversations, filter), [conversations, filter])

  // Danh sách là dữ liệu máy chủ: sự kiện Realtime chỉ nhắc làm mới (gộp các sự kiện dồn dập).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => router.refresh(), 250)
  }, [router])
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])
  useInboxEvents(refresh)

  const api = useMemo<ChatApi | null>(
    () =>
      selected
        ? {
            send: ({ body, clientId }) => sendMessage({ body, clientId, studentId: selected.studentId }),
            markRead,
            fetchLatest: (opts) => fetchMessages({ studentId: selected.studentId, ...opts }),
          }
        : null,
    [selected],
  )

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <Card className={`flex min-w-0 flex-col gap-3 !px-4 ${selected ? 'max-lg:hidden' : ''}`}>
        <SegmentedTabs
          label="Lọc hộp thư"
          idPrefix="inbox"
          panelId="inbox-list"
          items={TABS}
          value={filter}
          onChange={setFilter}
          className="[&_button]:!text-[14px] [&_button]:!min-h-11"
        />
        <label className="flex flex-col gap-1.5 text-[15px] font-extrabold text-ink">
          Nhắn cho học sinh
          <Select
            value=""
            data-testid="inbox-student-picker"
            onChange={(e) => e.target.value && router.push(`/hop-thu?hs=${e.target.value}`)}
          >
            <option value="">Chọn một bạn…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
        <div id="inbox-list" role="tabpanel" aria-labelledby={`inbox-${filter}`} className="flex flex-col gap-2">
          {visible.length === 0 && <EmptyState title="Chưa có tin nhắn nào." icon={ICONS.message} />}
          {visible.map((c) => (
            <ConversationItem key={c.id} c={c} active={selected?.studentId === c.studentId} />
          ))}
        </div>
      </Card>

      <Card className={`flex min-w-0 flex-col gap-3 !px-4 sm:!px-6 ${selected ? '' : 'max-lg:hidden'}`}>
        {selected && api ? (
          <>
            <div className="flex items-center gap-3">
              <Link
                href="/hop-thu"
                aria-label="Quay lại danh sách"
                className="flex size-11 flex-none items-center justify-center rounded-ctl bg-primary-soft text-primary-ink transition-colors hover:bg-primary-strong hover:text-white lg:hidden"
              >
                <Icon d="M15 18l-6-6 6-6" />
              </Link>
              <h2 className="m-0 min-w-0 truncate font-display text-xl font-extrabold" data-testid="inbox-chat-title">
                {selected.name}
              </h2>
            </div>
            <ChatPanel
              key={selected.studentId}
              viewerRole="teacher"
              initial={selected.initial}
              api={api}
              placeholder={`Cô muốn nhắn gì cho ${selected.name}?`}
              onChanged={refresh}
              className="h-[68dvh] min-h-[420px]"
            />
          </>
        ) : (
          <div className="m-auto py-16 text-center text-[15px] font-semibold text-muted">
            <Icon d={ICONS.message} size={36} className="mx-auto mb-2" />
            Chọn một bạn ở bên trái để xem và trả lời tin nhắn.
          </div>
        )}
      </Card>
    </div>
  )
}

function ConversationItem({ c, active }: { c: ConversationSummary; active: boolean }) {
  const waiting = conversationStatus(c.lastSenderRole) === 'waiting'
  return (
    <Link
      href={`/hop-thu?hs=${c.studentId}`}
      aria-current={active ? 'true' : undefined}
      data-testid="inbox-conversation"
      className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 transition-colors ${
        active ? 'border-primary-strong bg-primary-soft' : 'border-edge bg-white hover:bg-primary-soft'
      }`}
    >
      <AvatarImage avatar={c.avatar} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[15px] ${c.unreadCount > 0 ? 'font-extrabold' : 'font-bold'}`}>{c.studentName}</span>
          <span className="flex-none text-[13px] font-semibold text-muted">{formatListTime(c.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-[14px] ${c.unreadCount > 0 ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>{c.lastBody}</span>
          {c.unreadCount > 0 && (
            <span
              data-testid="inbox-unread-dot"
              aria-label={`${c.unreadCount} tin chưa đọc`}
              className="inline-flex min-w-5 flex-none items-center justify-center rounded-full bg-danger px-1.5 text-[12px] font-extrabold leading-5 text-white"
            >
              {c.unreadCount}
            </span>
          )}
        </div>
        {waiting && (
          <div className="mt-0.5">
            <Badge tone="star">Chờ phản hồi</Badge>
          </div>
        )}
      </div>
    </Link>
  )
}
