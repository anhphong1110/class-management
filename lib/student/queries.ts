import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { requireStudentOrTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatar, resolveAvatars, signAvatarPaths, toAvatarValue, type AvatarValue } from '@/lib/avatars/resolve'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { buildTodayLessons, type DisplayLesson } from '@/lib/display/logic'
import { getAnnouncements } from '@/lib/announcements/queries'
import type { AnnouncementView } from '@/lib/announcements/types'
import { getTimetable } from '@/lib/timetable/queries'
import {
  STUDENT_SETTING_COLUMNS,
  visibleStudentPages,
  type StudentPageId,
  type StudentSettings,
} from './flags'

export type StudentContext = {
  classId: string
  /** Giáo viên đang xem thử: dữ liệu là của học sinh đầu tiên. */
  preview: boolean
  studentId: string | null
  settings: StudentSettings
}

const DEFAULT_SETTINGS: StudentSettings = {
  feature_rewards: false,
  feature_missions: false,
  student_can_view_history: false,
  student_can_view_rank: false,
  student_can_view_rewards: false,
  student_can_view_timetable: false,
  student_can_view_attendance: false,
  student_can_view_news: false,
  student_can_change_avatar: false,
}

/** Một lần mỗi yêu cầu: layout và page dùng chung. */
export const getStudentContext = cache(async (): Promise<StudentContext> => {
  const user = await requireStudentOrTeacher()
  const supabase = await createServerSupabase()
  const preview = user.role === 'teacher'
  let studentId = user.studentId
  if (preview) {
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', user.classId)
      .is('archived_at', null)
      .order('roll_no', { ascending: true })
      .limit(1)
      .maybeSingle()
    studentId = data?.id ?? null
  }
  const { data: s } = await supabase
    .from('class_settings')
    .select(STUDENT_SETTING_COLUMNS)
    .eq('class_id', user.classId)
    .maybeSingle()
  return { classId: user.classId, preview, studentId, settings: (s as StudentSettings | null) ?? DEFAULT_SETTINGS }
})

/** Trang bị cô tắt thì 404 ngay trên máy chủ. */
export async function requireStudentPage(id: StudentPageId): Promise<StudentContext> {
  const ctx = await getStudentContext()
  if (!visibleStudentPages(ctx.settings).has(id)) notFound()
  return ctx
}

export type StudentProfile = {
  studentId: string
  fullName: string
  avatarId: string | null
  avatar: AvatarValue
  competitionStars: number
  availableStars: number
  rankYear: number | null
  classSize: number
}

type LbRow = { student_id: string; full_name: string; avatar_id: string | null; stars: number | string; rank: number | string }

export const getStudentProfile = cache(async (): Promise<StudentProfile | null> => {
  const ctx = await getStudentContext()
  if (!ctx.studentId) return null
  const supabase = await createServerSupabase()
  if (!ctx.preview) {
    const { data, error } = await supabase.rpc('my_profile_summary')
    if (error) throw new Error(error.message)
    const r = (data ?? [])[0]
    if (!r) return null
    return {
      studentId: r.student_id,
      fullName: r.full_name,
      avatarId: r.avatar_id,
      avatar: await resolveAvatar(r.avatar_id),
      competitionStars: Number(r.competition_stars),
      availableStars: Number(r.available_stars),
      rankYear: r.rank_year === null ? null : Number(r.rank_year),
      classSize: Number(r.class_size),
    }
  }
  // Giáo viên xem thử: giáo viên đọc được sổ sao và bảng xếp hạng của học sinh đầu tiên.
  const [stuRes, txRes, lbRes, sizeRes] = await Promise.all([
    supabase.from('students').select('id, full_name, avatar_id').eq('id', ctx.studentId).single(),
    supabase.from('star_transactions').select('delta, kind').eq('student_id', ctx.studentId),
    supabase.rpc('leaderboard_for_period', { p_period: 'year' }),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('class_id', ctx.classId).is('archived_at', null),
  ])
  for (const r of [stuRes, txRes, lbRes, sizeRes]) if (r.error) throw new Error(r.error.message)
  const stu = stuRes.data!
  const tx = txRes.data ?? []
  const competition = tx.filter((t) => ['award', 'penalty', 'reversal'].includes(t.kind)).reduce((a, t) => a + t.delta, 0)
  const rank = ((lbRes.data ?? []) as LbRow[]).find((r) => r.student_id === stu.id)
  return {
    studentId: stu.id,
    fullName: stu.full_name,
    avatarId: stu.avatar_id,
    avatar: await resolveAvatar(stu.avatar_id),
    competitionStars: competition,
    availableStars: tx.reduce((a, t) => a + t.delta, 0),
    rankYear: rank ? Number(rank.rank) : null,
    classSize: sizeRes.count ?? 0,
  }
})

export type LibraryAvatar = { id: string; label: string; avatar: AvatarValue }

/** Thư viện avatar còn hiện của lớp (học sinh được đọc theo RLS). */
export async function getAvatarLibrary(classId: string): Promise<LibraryAvatar[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('avatar_library')
    .select('id, kind, preset, image_path, label')
    .eq('class_id', classId)
    .eq('hidden', false)
    .order('created_at')
    .order('id')
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const urls = await signAvatarPaths(
    supabase,
    rows.filter((r) => r.kind === 'upload' && r.image_path).map((r) => r.image_path as string),
  )
  return rows.map((r) => ({ id: r.id, label: r.label, avatar: toAvatarValue(r, urls) }))
}

export type HomeData = {
  morning: DisplayLesson[]
  showTimetable: boolean
  news: AnnouncementView[]
  showNews: boolean
}

export async function getHomeData(ctx: StudentContext, now: Date = new Date()): Promise<HomeData> {
  const showTimetable = ctx.settings.student_can_view_timetable
  const showNews = ctx.settings.student_can_view_news
  const [timetable, announcements] = await Promise.all([
    showTimetable ? getTimetable(ctx.classId) : null,
    showNews ? getAnnouncements(ctx.classId, { includeArchived: false }) : [],
  ])
  const morning = timetable
    ? buildTodayLessons(timetable.slots, timetable.subjects, now, timetable.saturday)
        .filter((l) => l.label.startsWith('Tiết '))
        .slice(0, 5)
    : []
  return { morning, showTimetable, news: announcements.slice(0, 3), showNews }
}

export type HistoryRow = { id: string; delta: number; label: string; dateLabel: string }
export type BadgeRow = { id: string; name: string; earned: boolean }

export async function getStarsData(ctx: StudentContext, now: Date = new Date()) {
  const supabase = await createServerSupabase()
  let history: HistoryRow[] = []
  if (ctx.studentId) {
    if (!ctx.preview) {
      // View definer: nhãn trừ sao đã che, không có ghi chú.
      const { data, error } = await supabase
        .from('v_my_star_history')
        .select('id, delta, label, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
      history = (data ?? []).map((r) => ({
        id: r.id,
        delta: Number(r.delta),
        label: r.label,
        dateLabel: formatDayLabel(new Date(r.created_at), now),
      }))
    } else {
      const { data, error } = await supabase
        .from('star_transactions')
        .select('id, delta, kind, note, created_at')
        .eq('student_id', ctx.studentId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
      const label = (k: string, note: string | null) =>
        k === 'penalty' ? 'Trừ sao' : k === 'reserve' ? 'Giữ sao đổi quà' : k === 'release' ? 'Hoàn sao đã giữ' : k === 'award' ? note || 'Cộng sao' : 'Đổi quà'
      history = (data ?? []).map((r) => ({
        id: r.id,
        delta: Number(r.delta),
        label: label(r.kind, r.note),
        dateLabel: formatDayLabel(new Date(r.created_at), now),
      }))
    }
  }

  let badges: BadgeRow[] = []
  if (ctx.studentId && ctx.settings.feature_missions) {
    const [allRes, mineRes] = await Promise.all([
      supabase.from('badges').select('id, name').eq('class_id', ctx.classId).order('created_at').order('id'),
      supabase.from('student_badges').select('badge_id').eq('student_id', ctx.studentId),
    ])
    for (const r of [allRes, mineRes]) if (r.error) throw new Error(r.error.message)
    const earned = new Set((mineRes.data ?? []).map((r) => r.badge_id))
    badges = (allRes.data ?? []).map((b) => ({ id: b.id, name: b.name, earned: earned.has(b.id) }))
  }
  return { history, badges }
}

export type RankRow = {
  studentId: string
  name: string
  stars: number
  rank: number
  avatar: AvatarValue
  me: boolean
}

export async function getRankData(ctx: StudentContext): Promise<RankRow[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('leaderboard_for_period', { p_period: 'year' })
  if (error) throw new Error(error.message)
  const all = (data ?? []) as LbRow[]
  const top = all.slice(0, 5)
  const mine = all.find((r) => r.student_id === ctx.studentId)
  const shown = mine && !top.includes(mine) ? [...top, mine] : top
  const avatars = await resolveAvatars(shown.map((r) => r.avatar_id))
  return shown.map((r) => ({
    studentId: r.student_id,
    name: r.full_name,
    stars: Number(r.stars),
    rank: Number(r.rank),
    avatar: (r.avatar_id && avatars.get(r.avatar_id)) || null,
    me: r.student_id === ctx.studentId,
  }))
}
