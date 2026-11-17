import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { toMessageView } from './queries'
import { messageInput, type MessageView } from './types'

export type SendResult = { error?: string; message?: MessageView }
export type ReadResult = { error?: string }

const BLANK = (v: unknown) => typeof v !== 'string' || !v.trim()

/** Gửi một tin qua RPC. Giáo viên bắt buộc có studentId; học sinh thì bỏ qua (máy chủ tự lấy từ tài khoản). */
export async function sendMessageRpc(raw: unknown, role: 'student' | 'teacher'): Promise<SendResult> {
  const parsed = messageInput.safeParse(raw)
  if (!parsed.success) {
    const body = (raw as { body?: unknown } | null)?.body
    return { error: toVietnameseMessage(BLANK(body) || (typeof body === 'string' && body.trim().length > 2000) ? 'message_invalid' : 'invalid_input') }
  }
  const { body, clientId, studentId } = parsed.data
  if (role === 'teacher' && !studentId) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('send_message', {
    p_body: body,
    p_client_id: clientId,
    p_student_id: role === 'teacher' ? studentId : null,
  })
  if (error) return { error: toVietnameseMessage(error.message) }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { error: toVietnameseMessage('not_allowed') }
  return { message: toMessageView(row) }
}

export async function markReadRpc(conversationId: unknown): Promise<ReadResult> {
  if (typeof conversationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(conversationId)) return { error: toVietnameseMessage('invalid_input') }
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
  return error ? { error: toVietnameseMessage(error.message) } : {}
}
