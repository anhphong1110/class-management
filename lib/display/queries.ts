import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars, type AvatarValue } from '@/lib/avatars/resolve'
import { formatVietnameseDate } from '@/lib/domain/date'
import { periodRange } from '@/lib/domain/period'
import { getAnnouncements } from '@/lib/announcements/queries'
import type { AnnouncementView } from '@/lib/announcements/types'
import { getGroups } from '@/lib/stars/queries'
import { getTimetable } from '@/lib/timetable/queries'
import { buildHighlight, buildTodayLessons, type DisplayLesson } from './logic'
import type { LbRow } from '@/lib/stars/leaderboard-row'

export { buildHighlight, buildTodayLessons, selectDisplayWeekday } from './logic'

export type DisplayTop5Row = { id: string; name: string; stars: number; rank: number; avatar: AvatarValue; crown: boolean }
export type DisplayWeekRow = { id: string; name: string; stars: number }
export type { DisplayLesson }

export type DisplayData = {
  cls: { schoolYear: string; className: string; brandTitle: string | null; slogan: string; schoolName: string }
  schoolLogoUrl: string | null
  dateLabel: string
  top5: DisplayTop5Row[]
  weekTop3: DisplayWeekRow[]
  highlight: string
  today: DisplayLesson[]
  pinned: AnnouncementView | null
}

const NO_TERMS = { term1Start: '', term1End: '', term2Start: '', term2End: '' }

export async function getDisplayData(classId: string, now: Date = new Date()): Promise<DisplayData> {
  const supabase = await createServerSupabase()
  const { from, to } = periodRange('week', now, NO_TERMS)

  const [clsRes, yearRes, weekRes, totalsRes, groups, timetable, announcements] = await Promise.all([
    supabase.from('classes').select('school_year, class_name, brand_title, slogan, school_name, logo_path').eq('id', classId).single(),
    supabase.rpc('leaderboard_between', { p_from: null, p_to: null }),
    supabase.rpc('leaderboard_between', { p_from: from!, p_to: to! }),
    supabase.rpc('class_star_totals_between', { p_from: from!, p_to: to! }),
    getGroups(classId),
    getTimetable(classId),
    getAnnouncements(classId, { includeArchived: false }),
  ])
  for (const r of [clsRes, yearRes, weekRes, totalsRes]) if (r.error) throw new Error(r.error.message)
  const cls = clsRes.data
  if (!cls) throw new Error('class_not_found')

  const schoolLogoUrl = cls.logo_path
    ? ((await supabase.storage.from('class-media').createSignedUrl(cls.logo_path, 3600)).data?.signedUrl ?? null)
    : null

  const year = ((yearRes.data ?? []) as LbRow[]).slice(0, 5)
  const weekAll = (weekRes.data ?? []) as LbRow[]
  const weekTop = weekAll.filter((r) => Number(r.stars) > 0).slice(0, 3)
  const avatars = await resolveAvatars([...year, ...weekTop].map((r) => r.avatar_id))

  const top5: DisplayTop5Row[] = year.map((r) => ({
    id: r.student_id,
    name: r.full_name,
    stars: Number(r.stars),
    rank: Number(r.rank),
    avatar: (r.avatar_id && avatars.get(r.avatar_id)) || null,
    crown: Number(r.rank) === 1 && Number(r.stars) > 0,
  }))
  const weekTop3: DisplayWeekRow[] = weekTop.map((r) => ({ id: r.student_id, name: r.full_name, stars: Number(r.stars) }))

  // Tổ dẫn đầu tuần: cộng sao tuần của thành viên; hòa thì lấy tổ đứng trước theo thứ tự tổ.
  const weekBy = new Map(weekAll.map((r) => [r.student_id, Number(r.stars)]))
  let leading: string | null = null
  let best = 0
  for (const g of groups) {
    const total = g.memberIds.reduce((s, id) => s + (weekBy.get(id) ?? 0), 0)
    if (total > best) {
      best = total
      leading = g.name
    }
  }
  const t = (totalsRes.data ?? [])[0]
  const weekTotal = Math.max(0, Number(t?.awarded ?? 0) - Number(t?.penalized ?? 0))

  const today = buildTodayLessons(timetable.slots, timetable.subjects, now, timetable.saturday)

  return {
    cls: { schoolYear: cls.school_year, className: cls.class_name, brandTitle: cls.brand_title, slogan: cls.slogan, schoolName: cls.school_name },
    schoolLogoUrl,
    dateLabel: formatVietnameseDate(now),
    top5,
    weekTop3,
    highlight: buildHighlight(weekTotal, leading),
    today,
    pinned: announcements.find((a) => a.pinned) ?? null,
  }
}
