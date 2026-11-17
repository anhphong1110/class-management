import { z } from 'zod'
import type { AvatarValue } from '@/components/avatar/AvatarImage'

export const MAX_MESSAGE_LENGTH = 2000

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed thì không có.
export const messageInput = z.object({
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  clientId: z.guid(),
  studentId: z.guid().optional(),
})

export type MessageInput = z.infer<typeof messageInput>

export type SenderRole = 'teacher' | 'student'

export type MessageView = {
  id: string
  conversationId: string
  senderRole: SenderRole
  body: string
  clientId: string
  createdAt: string
  readAt: string | null
}

/** Dòng thô của bảng messages (từ PostgREST hoặc Realtime). */
export type MessageRow = {
  id: string
  conversation_id: string
  sender_role: SenderRole
  body: string
  client_id: string
  created_at: string
  read_at: string | null
}

export function messageFromRow(r: MessageRow): MessageView {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderRole: r.sender_role,
    body: r.body,
    clientId: r.client_id,
    createdAt: r.created_at,
    readAt: r.read_at,
  }
}

/** Tin trên màn hình: có thể là tin lạc quan chưa được máy chủ xác nhận. */
export type LocalMessage = MessageView & { pending?: 'sending' | 'failed' }

export type ConversationSummary = {
  id: string
  studentId: string
  studentName: string
  avatar: AvatarValue
  lastMessageAt: string
  lastSenderRole: SenderRole | null
  lastBody: string
  unreadCount: number
}

export type ConversationFilter = 'all' | 'unread' | 'waiting'

export type ConversationStatus = 'waiting' | 'answered'

/** "Chờ giáo viên phản hồi" khi tin cuối do học sinh gửi; ngược lại là "Đã phản hồi". */
export function conversationStatus(lastSenderRole: SenderRole | null | undefined): ConversationStatus {
  return lastSenderRole === 'student' ? 'waiting' : 'answered'
}

export const CONVERSATION_STATUS_LABEL: Record<ConversationStatus, string> = {
  waiting: 'Chờ giáo viên phản hồi',
  answered: 'Đã phản hồi',
}

/** Tin "Đã đọc" khi read_at có giá trị; ngược lại là "Đã gửi". */
export function messageStatusLabel(readAt: string | null | undefined): 'Đã gửi' | 'Đã đọc' {
  return readAt ? 'Đã đọc' : 'Đã gửi'
}

/** Đoạn xem trước một dòng: gộp khoảng trắng và xuống dòng, cắt ở `max` ký tự rồi thêm "…". */
export function previewText(body: string, max = 60): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  const chars = Array.from(flat)
  return chars.length <= max ? flat : `${chars.slice(0, max).join('').trimEnd()}…`
}

export function filterConversations(list: ConversationSummary[], filter: ConversationFilter): ConversationSummary[] {
  if (filter === 'unread') return list.filter((c) => c.unreadCount > 0)
  if (filter === 'waiting') return list.filter((c) => conversationStatus(c.lastSenderRole) === 'waiting')
  return list
}
