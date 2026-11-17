'use server'

import { z } from 'zod'
import { requireStudentOrTeacher } from '@/lib/auth/session'
import { getConversationMessages, getUnreadCount, type ConversationMessages } from '@/lib/inbox/queries'
import { markReadRpc, sendMessageRpc, type ReadResult, type SendResult } from '@/lib/inbox/service'
import { toVietnameseMessage } from '@/lib/errors'

const PREVIEW = 'Đang xem thử giao diện học sinh nên chưa gửi được tin nhắn.'

export async function sendMessage(raw: unknown): Promise<SendResult> {
  const user = await requireStudentOrTeacher()
  if (user.role !== 'student') return { error: PREVIEW }
  return sendMessageRpc(raw, 'student')
}

export async function markRead(conversationId: string): Promise<ReadResult> {
  const user = await requireStudentOrTeacher()
  if (user.role !== 'student') return {}
  return markReadRpc(conversationId)
}

/** Tải thêm tin cũ (trước mốc `beforeCreatedAt`) hoặc tải lại tin gần nhất của chính em. */
export async function fetchMessages(opts?: { beforeCreatedAt?: string }): Promise<{ error?: string; data?: ConversationMessages }> {
  const user = await requireStudentOrTeacher()
  if (user.role !== 'student' || !user.studentId) return { data: { conversationId: null, messages: [], hasMore: false } }
  const parsed = z.object({ beforeCreatedAt: z.iso.datetime({ offset: true }).optional() }).safeParse(opts ?? {})
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input_student') }
  try {
    return { data: await getConversationMessages({ studentId: user.studentId }, { before: parsed.data.beforeCreatedAt }) }
  } catch {
    return { error: toVietnameseMessage('invalid_input_student') }
  }
}

export async function fetchUnreadCount(): Promise<number> {
  const user = await requireStudentOrTeacher()
  if (user.role !== 'student') return 0
  return getUnreadCount()
}
