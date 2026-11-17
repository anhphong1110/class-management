import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars } from '@/lib/avatars/resolve'
import { filterConversations, messageFromRow, previewText, type ConversationFilter, type ConversationSummary, type MessageRow, type MessageView } from './types'

export const MESSAGE_PAGE_SIZE = 50

export const MESSAGE_COLUMNS = 'id, conversation_id, sender_role, body, client_id, created_at, read_at'

export const toMessageView = messageFromRow

/** Hội thoại của lớp, tin mới nhất xếp trước, kèm tên, avatar, đoạn xem trước và số tin học sinh chưa được đọc. */
export async function getTeacherConversations(classId: string, filter: ConversationFilter = 'all'): Promise<ConversationSummary[]> {
  const supabase = await createServerSupabase()
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, student_id, last_message_at, last_sender_role')
    .eq('class_id', classId)
    .order('last_message_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  const rows = convs ?? []
  if (!rows.length) return []

  const ids = rows.map((c) => c.id)
  const [students, unread, lasts] = await Promise.all([
    supabase.from('students').select('id, full_name, avatar_id').eq('class_id', classId).in('id', rows.map((c) => c.student_id)),
    supabase.from('messages').select('conversation_id').eq('class_id', classId).eq('sender_role', 'student').is('read_at', null).in('conversation_id', ids),
    Promise.all(
      ids.map((id) =>
        supabase.from('messages').select('conversation_id, body').eq('conversation_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ),
    ),
  ])
  if (students.error) throw new Error(students.error.message)
  if (unread.error) throw new Error(unread.error.message)
  for (const l of lasts) if (l.error) throw new Error(l.error.message)

  const avatars = await resolveAvatars((students.data ?? []).map((s) => s.avatar_id))
  const byStudent = new Map((students.data ?? []).map((s) => [s.id, s]))
  const unreadBy = new Map<string, number>()
  for (const u of unread.data ?? []) unreadBy.set(u.conversation_id, (unreadBy.get(u.conversation_id) ?? 0) + 1)
  const lastBy = new Map(lasts.flatMap((l) => (l.data ? [[l.data.conversation_id, l.data.body] as const] : [])))

  const list = rows.map((c): ConversationSummary => {
    const s = byStudent.get(c.student_id)
    return {
      id: c.id,
      studentId: c.student_id,
      studentName: s?.full_name ?? 'Học sinh',
      avatar: (s?.avatar_id && avatars.get(s.avatar_id)) || null,
      lastMessageAt: c.last_message_at,
      lastSenderRole: c.last_sender_role,
      lastBody: previewText(lastBy.get(c.id) ?? ''),
      unreadCount: unreadBy.get(c.id) ?? 0,
    }
  })
  return filterConversations(list, filter)
}

export type ConversationMessages = {
  conversationId: string | null
  messages: MessageView[]
  hasMore: boolean
}

/** 50 tin gần nhất (cũ trước), hoặc 50 tin trước mốc `before`. Chưa có hội thoại thì trả danh sách rỗng. */
export async function getConversationMessages(
  target: { conversationId: string } | { studentId: string },
  opts: { before?: string } = {},
): Promise<ConversationMessages> {
  const supabase = await createServerSupabase()
  let conversationId: string | null = null
  if ('conversationId' in target) conversationId = target.conversationId
  else {
    const { data, error } = await supabase.from('conversations').select('id').eq('student_id', target.studentId).maybeSingle()
    if (error) throw new Error(error.message)
    conversationId = data?.id ?? null
  }
  if (!conversationId) return { conversationId: null, messages: [], hasMore: false }

  let q = supabase.from('messages').select(MESSAGE_COLUMNS).eq('conversation_id', conversationId)
  if (opts.before) q = q.lt('created_at', opts.before)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const hasMore = rows.length > MESSAGE_PAGE_SIZE
  const messages = rows.slice(0, MESSAGE_PAGE_SIZE).reverse().map((r) => toMessageView(r as MessageRow))
  return { conversationId, messages, hasMore }
}

/** Số tin chưa đọc của người đang đăng nhập. Lỗi thì coi như 0 để không làm hỏng cả trang. */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('inbox_unread_count')
  if (error) return 0
  return typeof data === 'number' ? data : 0
}

export type InboxStudent = { id: string; name: string }

/** Học sinh đang học của lớp, để cô chọn khi muốn nhắn trước. */
export async function getActiveStudents(classId: string): Promise<InboxStudent[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('class_id', classId)
    .is('archived_at', null)
    .order('roll_no', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((s) => ({ id: s.id, name: s.full_name }))
}
