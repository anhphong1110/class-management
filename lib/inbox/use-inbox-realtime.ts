'use client'

import { useEffect, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { messageFromRow, type MessageRow, type MessageView } from './types'

export type InboxEvent =
  | { kind: 'insert' | 'update'; message: MessageView }
  /** Cần tải bù: kênh vừa (kết nối lại), tab hiện lại, hoặc máy có mạng lại. */
  | { kind: 'resync' }

/**
 * Nghe thay đổi bảng messages của lớp qua Realtime. Realtime chỉ là đường báo nhanh: mỗi lần kênh SUBSCRIBED,
 * tab hiện lại (visibilitychange) hoặc có mạng lại (online) đều gọi `onEvent({ kind: 'resync' })` để nơi dùng tải bù từ máy chủ.
 *
 * Xác thực: trình duyệt giữ phiên trong cookie (không httpOnly) nên createBrowserClient đọc được; hook vẫn gọi
 * `realtime.setAuth(access_token)` trước khi subscribe và mỗi khi token đổi, để RLS áp theo đúng người dùng.
 */
export function useInboxRealtime({ enabled, classId, onEvent }: { enabled: boolean; classId: string; onEvent: (e: InboxEvent) => void }) {
  const handler = useRef(onEvent)
  useEffect(() => {
    handler.current = onEvent
  })

  useEffect(() => {
    if (!enabled) return
    const supabase = createBrowserSupabase()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    const emit = (e: InboxEvent) => handler.current(e)

    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token)
    })

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return
      channel = supabase
        .channel(`inbox-${classId}-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}` }, (p) =>
          emit({ kind: 'insert', message: messageFromRow(p.new as MessageRow) }),
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}` }, (p) =>
          emit({ kind: 'update', message: messageFromRow(p.new as MessageRow) }),
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') emit({ kind: 'resync' })
        })
    })()

    const onVisible = () => {
      if (document.visibilityState === 'visible') emit({ kind: 'resync' })
    }
    const onOnline = () => emit({ kind: 'resync' })
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      auth.subscription.unsubscribe()
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, classId])
}
