import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getTimetable } from '@/lib/timetable/queries'
import { getStudentsWithStars } from '@/lib/stars/queries'
import { periodRange } from '@/lib/domain/period'
import type { SessionUser } from '@/lib/domain/types'
import type { Catalog, ChatIntent, RosterEntry } from '@/lib/chat/intents'
import {
  formatClassSize,
  formatClassStars,
  formatMyStars,
  formatRewards,
  formatStudentStars,
  formatSubjectPeriods,
  formatTeacherName,
  formatTimetableReply,
  formatTopStars,
  type RewardData,
  type TopRow,
} from '@/lib/chat/format'
import { CHAT_UNKNOWN, type ChatFlags } from '@/lib/chat/suggestions'

export const CHAT_ERROR = 'Mình gặp trục trặc nên chưa trả lời được. Bạn thử lại sau nhé.'

const NO_TERMS = { term1Start: '', term1End: '', term2Start: '', term2End: '' }

/** Giáo viên luôn xem được; học sinh theo cờ trong cài đặt lớp (RLS cũng chặn ở tầng dữ liệu). */
export async function loadFlags(user: SessionUser): Promise<ChatFlags> {
  if (user.role === 'teacher') return { timetable: true, rank: true, rewards: true }
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('class_settings')
    .select('student_can_view_timetable, student_can_view_rank, feature_rewards, student_can_view_rewards')
    .eq('class_id', user.classId)
    .maybeSingle()
  return {
    timetable: data?.student_can_view_timetable ?? false,
    rank: data?.student_can_view_rank ?? false,
    rewards: (data?.feature_rewards && data?.student_can_view_rewards) ?? false,
  }
}

/** Danh sách học sinh để nhận ra tên trong câu hỏi của giáo viên (đọc qua RLS). */
export async function loadTeacherRoster(user: SessionUser): Promise<RosterEntry[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('students').select('id, full_name').eq('class_id', user.classId).is('archived_at', null)
  if (error) throw new Error(error.message)
  return (data ?? []).map((s) => ({ id: s.id, fullName: s.full_name }))
}

/**
 * Tên môn và tên quà của lớp để nhận ra trong câu hỏi. Chỉ đọc phần người dùng được xem; lỗi thì bỏ qua
 * (câu hỏi vẫn được xử lý, chỉ không nhận ra tên cụ thể).
 */
export async function loadCatalog(user: SessionUser, flags: ChatFlags): Promise<Catalog> {
  const supabase = await createServerSupabase()
  const [subjects, rewards] = await Promise.all([
    flags.timetable ? supabase.from('subjects').select('name').eq('class_id', user.classId) : Promise.resolve({ data: [] as { name: string }[] }),
    flags.rewards ? supabase.rpc('reward_availability') : Promise.resolve({ data: [] as { name: string }[] }),
  ])
  return {
    subjects: (subjects.data ?? []).map((s) => s.name),
    rewards: ((rewards.data ?? []) as { name: string }[]).map((r) => r.name),
  }
}

/**
 * Tên cần che trước khi gửi câu hỏi cho model bên ngoài: học sinh của lớp và cô giáo.
 * Dùng quyền máy chủ vì học sinh không đọc được tên các bạn qua RLS; danh sách này không bao giờ được trả về
 * cho trình duyệt.
 */
export async function loadRosterForMasking(user: SessionUser): Promise<RosterEntry[]> {
  const admin = createAdminSupabase()
  const [students, cls] = await Promise.all([
    admin.from('students').select('id, full_name').eq('class_id', user.classId).is('archived_at', null),
    admin.from('classes').select('teacher_name').eq('id', user.classId).maybeSingle(),
  ])
  if (students.error) throw new Error(students.error.message)
  const roster = (students.data ?? []).map((s) => ({ id: s.id, fullName: s.full_name }))
  const teacher = cls.data?.teacher_name?.trim()
  return teacher ? [...roster, { id: 'teacher', fullName: teacher }] : roster
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

const NOT_OPEN = (what: string) => `Giáo viên chưa mở phần ${what} cho các bạn xem.`

export async function runIntent(intent: ChatIntent, user: SessionUser, flags: ChatFlags, now: Date = new Date()): Promise<string> {
  const isStudent = user.role === 'student'
  switch (intent.intent) {
    case 'timetable': {
      if (isStudent && !flags.timetable) return NOT_OPEN('thời khóa biểu')
      return formatTimetableReply(intent.day, now, await getTimetable(user.classId))
    }
    case 'subject_periods': {
      if (isStudent && !flags.timetable) return NOT_OPEN('thời khóa biểu')
      const tt = await getTimetable(user.classId)
      return formatSubjectPeriods(
        tt.subjects.map((s) => ({ name: s.name, usedCount: s.usedCount })),
        intent.subject,
      )
    }
    case 'top_stars': {
      if (isStudent && !flags.rank) return NOT_OPEN('bảng xếp hạng')
      const supabase = await createServerSupabase()
      const { data, error } = await supabase.rpc('leaderboard_for_period', { p_period: intent.period })
      if (error) throw new Error(error.message)
      return formatTopStars(intent.period, (data ?? []) as TopRow[], intent.limit)
    }
    case 'class_stars': {
      if (isStudent) return 'Tổng sao cả lớp chỉ dành cho giáo viên xem. Bạn thử hỏi "Ai cao sao nhất?" nhé.'
      const { from, to } = periodRange(intent.period, now, NO_TERMS)
      const supabase = await createServerSupabase()
      const { data, error } = await supabase.rpc('class_star_totals_between', { p_from: from!, p_to: to! })
      if (error) throw new Error(error.message)
      const totals = data?.[0]
      return formatClassStars(intent.period, { awarded: Number(totals?.awarded ?? 0), penalized: Number(totals?.penalized ?? 0) })
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
    case 'class_size': {
      const supabase = await createServerSupabase()
      if (!isStudent) {
        const { count, error } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', user.classId)
          .is('archived_at', null)
        if (error) throw new Error(error.message)
        return formatClassSize(count ?? 0)
      }
      const { data, error } = await supabase.rpc('my_profile_summary')
      if (error) throw new Error(error.message)
      const size = data?.[0]?.class_size
      return size == null ? NOT_OPEN('sĩ số lớp') : formatClassSize(Number(size))
    }
    case 'teacher_name': {
      const supabase = await createServerSupabase()
      const { data } = await supabase.from('classes').select('teacher_name').eq('id', user.classId).maybeSingle()
      return formatTeacherName(data?.teacher_name ?? '') ?? CHAT_UNKNOWN
    }
    case 'rewards': {
      if (isStudent && !flags.rewards) return NOT_OPEN('quà')
      const supabase = await createServerSupabase()
      const { data, error } = await supabase.rpc('reward_availability')
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as { name: string; cost: number; left_count: number }[]
      const rewards: RewardData[] = rows.map((r) => ({ name: r.name, cost: r.cost, left: r.left_count }))
      return formatRewards(rewards, intent.name)
    }
  }
}
