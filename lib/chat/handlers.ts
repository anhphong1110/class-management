import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getTimetable } from '@/lib/timetable/queries'
import { getStudentsWithStars } from '@/lib/stars/queries'
import type { SessionUser } from '@/lib/domain/types'
import type { ChatIntent, RosterEntry } from '@/lib/chat/intents'
import { formatMyStars, formatStudentStars, formatTimetableReply, formatTopStars, type TopRow } from '@/lib/chat/format'
import type { ChatFlags } from '@/lib/chat/suggestions'

export const CHAT_ERROR = 'Mình gặp trục trặc nên chưa trả lời được. Bạn thử lại sau nhé.'

/** Giáo viên luôn xem được; học sinh theo cờ trong cài đặt lớp (RLS cũng chặn ở tầng dữ liệu). */
export async function loadFlags(user: SessionUser): Promise<ChatFlags> {
  if (user.role === 'teacher') return { timetable: true, rank: true }
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('class_settings')
    .select('student_can_view_timetable, student_can_view_rank')
    .eq('class_id', user.classId)
    .maybeSingle()
  return { timetable: data?.student_can_view_timetable ?? false, rank: data?.student_can_view_rank ?? false }
}

/** Danh sách học sinh để nhận ra tên trong câu hỏi của giáo viên (đọc qua RLS). */
export async function loadTeacherRoster(user: SessionUser): Promise<RosterEntry[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('students').select('id, full_name').eq('class_id', user.classId).is('archived_at', null)
  if (error) throw new Error(error.message)
  return (data ?? []).map((s) => ({ id: s.id, fullName: s.full_name }))
}

/**
 * Danh sách tên chỉ để che tên học sinh trước khi gửi câu hỏi cho model bên ngoài.
 * Dùng quyền máy chủ vì học sinh không đọc được tên các bạn qua RLS; danh sách này không bao giờ
 * được trả về cho trình duyệt.
 */
export async function loadRosterForMasking(user: SessionUser): Promise<RosterEntry[]> {
  const { data, error } = await createAdminSupabase()
    .from('students')
    .select('id, full_name')
    .eq('class_id', user.classId)
    .is('archived_at', null)
  if (error) throw new Error(error.message)
  return (data ?? []).map((s) => ({ id: s.id, fullName: s.full_name }))
}

export async function loadClassTheme(classId: string): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('classes').select('theme').eq('id', classId).maybeSingle()
  return data?.theme ?? null
}

/** Theme của lớp chưa lưu trữ đầu tiên, giống trang đăng nhập (chưa có phiên nên cần quyền máy chủ). */
export async function loadPublicTheme(): Promise<string | null> {
  const { data } = await createAdminSupabase()
    .from('classes')
    .select('theme')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.theme ?? null
}

export async function runIntent(intent: ChatIntent, user: SessionUser, flags: ChatFlags, now: Date = new Date()): Promise<string> {
  const isStudent = user.role === 'student'
  switch (intent.intent) {
    case 'timetable': {
      if (isStudent && !flags.timetable) return 'Giáo viên chưa mở phần thời khóa biểu cho các bạn xem.'
      return formatTimetableReply(intent.day, now, await getTimetable(user.classId))
    }
    case 'top_stars': {
      if (isStudent && !flags.rank) return 'Giáo viên chưa mở bảng xếp hạng cho các bạn xem.'
      const supabase = await createServerSupabase()
      const { data, error } = await supabase.rpc('leaderboard_for_period', { p_period: intent.period })
      if (error) throw new Error(error.message)
      return formatTopStars(intent.period, (data ?? []) as TopRow[], intent.limit)
    }
    case 'my_stars': {
      if (!isStudent) return 'Bạn muốn xem sao của học sinh nào? Hãy nói tên bạn ấy nhé.'
      const supabase = await createServerSupabase()
      const { data, error } = await supabase.rpc('my_profile_summary')
      if (error) throw new Error(error.message)
      const row = data?.[0]
      if (!row) return CHAT_ERROR
      return formatMyStars({
        competition: row.competition_stars,
        available: row.available_stars,
        rank: row.rank_year,
        classSize: row.class_size,
      })
    }
    case 'student_stars': {
      if (isStudent) return 'Mình chỉ cho bạn xem sao của chính bạn thôi. Bạn hỏi "Mình có bao nhiêu sao?" nhé.'
      const ids = new Set(intent.studentIds)
      const all = await getStudentsWithStars(user.classId)
      return formatStudentStars(
        all.filter((s) => ids.has(s.id)).map((s) => ({ fullName: s.fullName, competition: s.competition, available: s.available })),
      )
    }
  }
}
