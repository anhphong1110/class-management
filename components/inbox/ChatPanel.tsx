'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { mergeMessages, setPending } from '@/lib/inbox/merge'
import { formatMessageTime } from '@/lib/inbox/time'
import {
  MAX_MESSAGE_LENGTH,
  messageStatusLabel,
  type LocalMessage,
  type MessageView,
  type SenderRole,
} from '@/lib/inbox/types'
import type { ConversationMessages } from '@/lib/inbox/queries'
import { useInbox, useInboxEvents } from './InboxProvider'

export type ChatApi = {
  send: (input: { body: string; clientId: string }) => Promise<{ error?: string; message?: MessageView }>
  markRead: (conversationId: string) => Promise<{ error?: string }>
  fetchLatest: (opts?: { beforeCreatedAt?: string }) => Promise<{ error?: string; data?: ConversationMessages }>
}

const NETWORK_ERROR = 'Chưa gửi được tin. Kiểm tra mạng rồi bấm "Gửi lại" nhé.'

/**
 * Khung trò chuyện dùng chung cho học sinh và giáo viên. Tin hiện ngay (lạc quan) với clientId do trình duyệt tạo;
 * lỗi thì giữ tin kèm nút "Gửi lại" dùng đúng clientId đó, nên máy chủ không bao giờ tạo hai dòng.
 * Nội dung luôn là văn bản thuần (React tự escape), giữ xuống dòng.
 */
export function ChatPanel({
  viewerRole,
  initial,
  api,
  placeholder,
  onChanged,
  className = '',
}: {
  viewerRole: SenderRole
  initial: ConversationMessages
  api: ChatApi
  placeholder: string
  /** Gọi sau khi gửi hoặc đã đánh dấu đọc, để danh sách bên ngoài làm mới. */
  onChanged?: () => void
  className?: string
}) {
  const { refreshCount } = useInbox()
  const [messages, setMessages] = useState<LocalMessage[]>(initial.messages)
  const [conversationId, setConversationId] = useState(initial.conversationId)
  const [hasMore, setHasMore] = useState(initial.hasMore)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const readRef = useRef<string | null>(null)
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  })
  const convRef = useRef(conversationId)
  useEffect(() => {
    convRef.current = conversationId
  })
  const apiRef = useRef(api)
  useEffect(() => {
    apiRef.current = api
  })

  const length = Array.from(text).length
  const tooLong = length > MAX_MESSAGE_LENGTH
  const empty = text.trim().length === 0

  // Đánh dấu đã đọc các tin của bên kia khi đang mở hội thoại và tab đang hiện.
  const markIfUnread = useCallback(
    async (list: LocalMessage[], convId: string | null) => {
      if (!convId || document.visibilityState !== 'visible') return
      const newest = list.filter((m) => m.senderRole !== viewerRole && !m.readAt && !m.pending).at(-1)
      if (!newest || readRef.current === newest.id) return
      readRef.current = newest.id
      const res = await apiRef.current.markRead(convId).catch(() => ({ error: 'network' }))
      if (res.error) readRef.current = null
      else {
        refreshCount()
        onChanged?.()
      }
    },
    [viewerRole, refreshCount, onChanged],
  )

  useEffect(() => {
    void markIfUnread(messagesRef.current, convRef.current)
  }, [markIfUnread])

  const refetch = useCallback(async () => {
    const res = await apiRef.current.fetchLatest().catch(() => null)
    if (!res?.data) return
    const data = res.data
    if (data.conversationId) setConversationId(data.conversationId)
    const next = mergeMessages(messagesRef.current, data.messages)
    setMessages(next)
    void markIfUnread(next, data.conversationId ?? convRef.current)
  }, [markIfUnread])

  useInboxEvents((e) => {
    if (e.kind === 'resync') {
      void refetch()
      return
    }
    const m = e.message
    const known = convRef.current
    if (known && m.conversationId !== known) return
    if (!known) {
      // Chưa biết hội thoại của mình: tải lại để biết có phải tin của hội thoại này không (RLS đã lọc theo người dùng).
      void refetch()
      return
    }
    const next = mergeMessages(messagesRef.current, [m])
    setMessages(next)
    if (e.kind === 'insert') void markIfUnread(next, known)
  })

  // Cuộn xuống cuối khi có tin mới, trừ khi người dùng đang đọc phần trên.
  useEffect(() => {
    const el = logRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = useCallback(
    async (clientId: string, body: string) => {
      setError(null)
      setSending(true)
      stick.current = true
      const optimistic: LocalMessage = {
        id: `local-${clientId}`,
        conversationId: convRef.current ?? '',
        senderRole: viewerRole,
        body,
        clientId,
        createdAt: new Date().toISOString(),
        readAt: null,
        pending: 'sending',
      }
      setMessages((prev) => mergeMessages(prev, [optimistic]))
      try {
        const res = await apiRef.current.send({ body, clientId })
        if (res.message) {
          setConversationId((c) => c ?? res.message!.conversationId)
          setMessages((prev) => mergeMessages(prev, [res.message!]))
          onChanged?.()
        } else {
          setMessages((prev) => setPending(prev, clientId, 'failed'))
          setError(res.error ?? NETWORK_ERROR)
        }
      } catch {
        setMessages((prev) => setPending(prev, clientId, 'failed'))
        setError(NETWORK_ERROR)
      } finally {
        setSending(false)
      }
    },
    [viewerRole, onChanged],
  )

  const submit = () => {
    if (sending || empty || tooLong) return
    const body = text.trim()
    setText('')
    void send(crypto.randomUUID(), body)
  }

  const resend = (m: LocalMessage) => {
    if (sending) return
    void send(m.clientId, m.body)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const loadMore = async () => {
    const oldest = messages.find((m) => !m.pending)
    if (!oldest || loadingMore) return
    setLoadingMore(true)
    stick.current = false
    const el = logRef.current
    const prevHeight = el?.scrollHeight ?? 0
    const res = await apiRef.current.fetchLatest({ beforeCreatedAt: oldest.createdAt }).catch(() => null)
    if (res?.data) {
      setMessages((prev) => mergeMessages(prev, res.data!.messages))
      setHasMore(res.data.hasMore)
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight
      })
    }
    setLoadingMore(false)
  }

  const onScroll = () => {
    const el = logRef.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${className}`}>
      <div
        ref={logRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Tin nhắn"
        data-testid="chat-log"
        className="flex min-h-[240px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-panel bg-primary-soft/50 p-3 sm:p-4"
      >
        {hasMore && (
          <div className="flex justify-center">
            <Button variant="ghost" onClick={loadMore} loading={loadingMore} className="!min-h-10 text-sm">
              Xem tin cũ hơn
            </Button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="m-auto flex flex-col items-center gap-2 py-8 text-center text-[15px] font-semibold text-muted">
            <Icon d={ICONS.message} size={32} />
            Chưa có tin nhắn nào.
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.clientId} m={m} mine={m.senderRole === viewerRole} onResend={() => resend(m)} sending={sending} />
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-col gap-2">
        <Textarea
          aria-label="Nội dung tin nhắn"
          aria-invalid={tooLong || undefined}
          data-testid="chat-input"
          rows={2}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className="!min-h-[64px] resize-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            data-testid="chat-counter"
            className={`text-sm font-bold ${tooLong ? 'text-danger-deep' : 'text-muted'}`}
          >
            {length}/{MAX_MESSAGE_LENGTH}
            {tooLong ? ' – dài quá, hãy rút gọn bớt nhé' : ''}
          </span>
          <Button onClick={submit} disabled={empty || tooLong} loading={sending} data-testid="chat-send">
            <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4z" size={18} />
            Gửi tin nhắn
          </Button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ m, mine, onResend, sending }: { m: LocalMessage; mine: boolean; onResend: () => void; sending: boolean }) {
  const status = m.pending === 'sending' ? 'Đang gửi…' : m.pending === 'failed' ? 'Chưa gửi được' : messageStatusLabel(m.readAt)
  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`} data-testid="chat-message" data-mine={mine ? '1' : '0'}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-base leading-normal ${
          mine
            ? 'rounded-br-md bg-primary-strong text-white'
            : 'rounded-bl-md border-2 border-edge bg-white text-ink'
        } ${m.pending === 'failed' ? '!bg-danger-soft !text-danger-deep' : ''}`}
      >
        {m.body}
      </div>
      <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-muted">
        <time dateTime={m.createdAt}>{formatMessageTime(m.createdAt)}</time>
        {mine && (
          <span data-testid="chat-status" className={m.pending === 'failed' ? 'font-extrabold text-danger-deep' : ''}>
            · {status}
          </span>
        )}
        {m.pending === 'failed' && (
          <button
            type="button"
            onClick={onResend}
            disabled={sending}
            className="min-h-8 rounded-ctl px-2 text-[13px] font-extrabold text-primary-strong underline disabled:opacity-50"
          >
            Gửi lại
          </button>
        )}
      </div>
    </div>
  )
}
