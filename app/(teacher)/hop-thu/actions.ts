'use server'

import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { getConversationMessages, getUnreadCount, type ConversationMessages } from '@/lib/inbox/queries'
import { markReadRpc, sendMessageRpc, type ReadResult, type SendResult } from '@/lib/inbox/service'
import { toVietnameseMessage } from '@/lib/errors'

const fetchInput = z.object({
  studentId: z.guid(),
  beforeCreatedAt: z.iso.datetime({ offset: true }).optional(),
})

export async function sendMessage(raw: unknown): Promise<SendResult> {
  await requireTeacher()
  return sendMessageRpc(raw, 'teacher')
}

export async function markRead(conversationId: string): Promise<ReadResult> {
  await requireTeacher()
  return markReadRpc(conversationId)
}

/** Tin của hội thoại với một học sinh; RLS chỉ cho đọc học sinh trong lớp của cô. */
export async function fetchMessages(raw: unknown): Promise<{ error?: string; data?: ConversationMessages }> {
  await requireTeacher()
  const parsed = fetchInput.safeParse(raw)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input') }
  try {
    return { data: await getConversationMessages({ studentId: parsed.data.studentId }, { before: parsed.data.beforeCreatedAt }) }
  } catch {
    return { error: toVietnameseMessage('invalid_input') }
  }
}

export async function fetchUnreadCount(): Promise<number> {
  await requireTeacher()
  return getUnreadCount()
}
