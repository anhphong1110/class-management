'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { themeVars } from '@/lib/domain/theme'
import { CHAT_GREETING, CHAT_LOGIN_HINT } from '@/lib/chat/suggestions'
import { Icon } from '@/components/ui/Icon'

type Msg = { id: number; from: 'me' | 'bot'; text: string }
type Info = { role: 'teacher' | 'student' | null; theme: string | null; suggestions: string[] }

const OPEN_KEY = 'bong-chat-open'
const SEND_ICON = 'M22 2L11 13M22 2l-7 20-4-9-9-4z'
const LOGO = '/brand/chat/bong.png'

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn dùng được, chỉ không nhớ trạng thái.
  }
}

/** Khung chat nổi của Bông. Màu theo theme lớp, hiện ở mọi trang (gắn một lần ở root layout). */
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<Info>({ role: null, theme: null, suggestions: [] })
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  const refreshInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' })
      if (res.ok) setInfo((await res.json()) as Info)
    } catch {
      // Mất mạng: giữ thông tin cũ.
    }
  }, [])

  useEffect(() => {
    setOpen(readOpen())
    void refreshInfo()
  }, [refreshInfo])

  // Mỗi lần mở lại tải thông tin mới để đổi màu ở Cài đặt thì lần mở sau đã đúng màu.
  useEffect(() => {
    if (!open) return
    void refreshInfo()
    inputRef.current?.focus()
  }, [open, refreshInfo])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages, busy])

  const setOpenPersist = useCallback((next: boolean) => {
    setOpen(next)
    writeOpen(next)
  }, [])

  const close = useCallback(() => {
    setOpenPersist(false)
    fabRef.current?.focus()
  }, [setOpenPersist])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const push = (from: Msg['from'], body: string) =>
    setMessages((m) => [...m, { id: nextId.current++, from, text: body }])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy || !info.role) return
    push('me', q)
    setText('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q }),
      })
      if (res.status === 401) {
        setInfo((i) => ({ ...i, role: null, suggestions: [] }))
        push('bot', CHAT_LOGIN_HINT)
        return
      }
      const data = (await res.json().catch(() => null)) as { reply?: string; suggestions?: string[] } | null
      push('bot', data?.reply ?? 'Mình gặp trục trặc nên chưa trả lời được. Bạn thử lại sau nhé.')
      if (data?.suggestions) setInfo((i) => ({ ...i, suggestions: data.suggestions! }))
    } catch {
      push('bot', 'Mình chưa kết nối được. Bạn kiểm tra mạng rồi thử lại nhé.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(text)
  }

  const guest = info.role === null

  return (
    <div style={themeVars(info.theme) as CSSProperties} className="print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Khung chat với Bông"
          className="clay-card fixed inset-x-3 bottom-[160px] top-14 z-40 flex flex-col overflow-hidden text-ink shadow-pop sm:inset-x-auto sm:right-5 sm:top-auto sm:bottom-[104px] sm:h-[450px] sm:w-[340px] lg:bottom-[104px]"
        >
          <div className="flex items-center gap-2.5 bg-primary py-3 pl-3.5 pr-3 text-white">
            <img src={LOGO} alt="" width={40} height={40} className="size-10 flex-none rounded-full border-2 border-white bg-white object-cover" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[18px] font-extrabold leading-none">Bông</div>
              <div className="text-[12px] font-bold">Bạn đồng hành học tập</div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Đóng khung chat"
              className="flex size-11 flex-none items-center justify-center rounded-chip border-2 border-white/60 bg-white/15 text-white hover:bg-white/25"
            >
              <Icon d="M6 6l12 12M18 6L6 18" size={20} />
            </button>
          </div>

          <div ref={logRef} aria-live="polite" className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-white p-3.5">
            <Bubble from="bot" text={CHAT_GREETING} />
            {guest && <Bubble from="bot" text={CHAT_LOGIN_HINT} />}
            {messages.map((m) => (
              <Bubble key={m.id} from={m.from} text={m.text} />
            ))}
            {busy && <Bubble from="bot" text="Bông đang nghĩ…" />}
          </div>

          {info.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t-2 border-bg px-3 pb-1 pt-2">
              {info.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  disabled={busy}
                  className="clay-press min-h-11 rounded-chip border-2 border-edge bg-white px-3.5 text-[14px] font-bold text-primary-ink [--edge:var(--primary-edge)] hover:bg-primary-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex gap-2 px-3 pb-3 pt-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              disabled={guest}
              aria-label="Câu hỏi cho Bông"
              placeholder={guest ? 'Đăng nhập để hỏi Bông' : 'Thứ ba học môn gì?'}
              className="clay-field min-w-0 flex-1 !min-h-12 text-[14px]"
            />
            <button
              type="submit"
              disabled={guest || busy || !text.trim()}
              aria-label="Gửi câu hỏi"
              className="clay-press flex size-12 flex-none items-center justify-center rounded-ctl bg-primary-strong text-white [--edge:var(--primary-deep)] disabled:opacity-60"
            >
              <Icon d={SEND_ICON} size={20} />
            </button>
          </form>
        </div>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpenPersist(!open)}
        aria-label={open ? 'Đóng khung chat với Bông' : 'Mở khung chat với Bông'}
        aria-expanded={open}
        className="clay-press fixed bottom-[92px] right-3 z-40 size-14 overflow-hidden rounded-full border-[3px] border-white bg-primary p-0 [--edge:var(--primary-deep)] sm:right-5 lg:bottom-5 lg:size-[68px]"
      >
        <img src={LOGO} alt="" width={68} height={68} className="size-full object-cover" />
      </button>
    </div>
  )
}

function Bubble({ from, text }: { from: Msg['from']; text: string }) {
  const mine = from === 'me'
  return (
    <div
      className={`max-w-[82%] whitespace-pre-line rounded-[18px] px-3.5 py-2.5 text-[14px] font-semibold leading-normal ${
        mine
          ? 'self-end rounded-br-[6px] bg-primary-strong text-white'
          : 'self-start rounded-bl-[6px] border-2 border-edge bg-bg'
      }`}
    >
      {text}
    </div>
  )
}
