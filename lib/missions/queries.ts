import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { missionPeriodKey, type MissionPeriod } from './period'

export type MissionView = {
  id: string
  name: string
  period: MissionPeriod
  condition: string
  rewardStars: number
  active: boolean
  /** Số bạn đang học đã hoàn thành trong kỳ hiện tại. */
  doneCount: number
  /** Các lượt hoàn thành của kỳ hiện tại (để hoàn tác từng lượt). */
  completions: { id: string; studentId: string }[]
}

export type BadgeView = {
  id: string
  name: string
  icon: string
  gradient: string
  /** Số bạn đang học đã đạt. */
  count: number
  /** Các bạn đang học đã có huy hiệu này (để chỉ cho thu hồi khi bạn đang chọn có huy hiệu). */
  holderIds: string[]
}

export type MissionsData = {
  featureOn: boolean
  studentCount: number
  missions: MissionView[]
  badges: BadgeView[]
}

export async function getMissionsData(classId: string, now = new Date()): Promise<MissionsData> {
  const supabase = await createServerSupabase()
  const [classRes, settingsRes, studentsRes, missionsRes, completionsRes, badgesRes, awardedRes] = await Promise.all([
    supabase.from('classes').select('term1_start, term1_end, term2_start, term2_end').eq('id', classId).maybeSingle(),
    supabase.from('class_settings').select('feature_missions').eq('class_id', classId).maybeSingle(),
    supabase.from('students').select('id').eq('class_id', classId).is('archived_at', null),
    supabase
      .from('missions')
      .select('id, name, period, condition, reward_stars, active')
      .eq('class_id', classId)
      .order('created_at')
      .order('id'),
    supabase.from('mission_completions').select('id, mission_id, student_id, period_key').eq('class_id', classId),
    supabase.from('badges').select('id, name, icon, gradient').eq('class_id', classId).order('created_at').order('id'),
    supabase.from('student_badges').select('badge_id, student_id').eq('class_id', classId),
  ])
  for (const r of [classRes, settingsRes, studentsRes, missionsRes, completionsRes, badgesRes, awardedRes]) {
    if (r.error) throw new Error(r.error.message)
  }
  const cls = classRes.data
  const terms = {
    term1Start: cls?.term1_start ?? null,
    term1End: cls?.term1_end ?? null,
    term2Start: cls?.term2_start ?? null,
    term2End: cls?.term2_end ?? null,
  }
  const active = new Set((studentsRes.data ?? []).map((s) => s.id as string))
  const completions = (completionsRes.data ?? []).filter((c) => active.has(c.student_id as string))
  const awarded = (awardedRes.data ?? []).filter((a) => active.has(a.student_id as string))

  return {
    featureOn: settingsRes.data?.feature_missions ?? true,
    studentCount: active.size,
    missions: (missionsRes.data ?? []).map((m) => {
      const period = m.period as MissionPeriod
      const key = missionPeriodKey(period, now, terms)
      const current = completions.filter((c) => c.mission_id === m.id && c.period_key === key)
      return {
        id: m.id,
        name: m.name,
        period,
        condition: m.condition,
        rewardStars: m.reward_stars,
        active: m.active,
        doneCount: current.length,
        completions: current.map((c) => ({ id: c.id as string, studentId: c.student_id as string })),
      }
    }),
    badges: (badgesRes.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      gradient: b.gradient,
      count: awarded.filter((a) => a.badge_id === b.id).length,
      holderIds: awarded.filter((a) => a.badge_id === b.id).map((a) => a.student_id as string),
    })),
  }
}
