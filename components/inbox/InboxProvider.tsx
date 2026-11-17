'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useInboxRealtime, type InboxEvent } from '@/lib/inbox/use-inbox-realtime'

type Listener = (e: InboxEvent) => void

type InboxContextValue = {
  count: number
  /** Hỏi lại máy chủ số tin chưa đọc (gộp các lần gọi liên tiếp). */
  refreshCount: () => void
  /** Đăng ký nhận sự kiện Realtime; trả về hàm hủy. */
  subscribe: (l: Listener) => () => void
}

const InboxContext = createContext<InboxContextValue>({ count: 0, refreshCount: () => {}, subscribe: () => () => {} })

/**
 * Giữ số tin chưa đọc và một kênh Realtime duy nhất cho cả khung trang (huy hiệu ở thanh trên, chấm ở menu, trang hộp thư).
 * `initialCount` do máy chủ tính; sau đó cập nhật theo sự kiện và tải bù khi kết nối lại.
 */
export function InboxProvider({
  initialCount,
  classId,
  enabled,
  fetchCount,
  children,
}: {
  initialCount: number
  classId: string
  enabled: boolean
  fetchCount: () => Promise<number>
  children: ReactNode
}) {
  const [count, setCount] = useState(initialCount)
  const listeners = useRef(new Set<Listener>())
  const inflight = useRef(false)
  const again = useRef(false)
  const fetchRef = useRef(fetchCount)
  useEffect(() => {
    fetchRef.current = fetchCount
  })

  const refreshCount = useCallback(() => {
    if (inflight.current) {
      again.current = true
      return
    }
    inflight.current = true
    void (async () => {
      try {
        const n = await fetchRef.current()
        if (typeof n === 'number') setCount(n)
      } catch {
        // Mất mạng: giữ số cũ, lần kết nối lại sẽ tải bù.
      } finally {
        inflight.current = false
        if (again.current) {
          again.current = false
          refreshCount()
        }
      }
    })()
  }, [])

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l)
    return () => {
      listeners.current.delete(l)
    }
  }, [])

  useInboxRealtime({
    enabled,
    classId,
    onEvent: (e) => {
      refreshCount()
      listeners.current.forEach((l) => l(e))
    },
  })

  const value = useMemo(() => ({ count, refreshCount, subscribe }), [count, refreshCount, subscribe])
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export function useInbox(): InboxContextValue {
  return useContext(InboxContext)
}

/** Nhận sự kiện hộp thư trong lúc component đang hiện. */
export function useInboxEvents(handler: Listener) {
  const { subscribe } = useInbox()
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe])
}
