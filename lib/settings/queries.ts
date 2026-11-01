import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import type { ThemeKey } from '@/lib/domain/theme'

export type SettingsClass = {
  school_name: string
  class_name: string
  brand_title: string | null
  school_year: string
  teacher_name: string
  slogan: string
  theme: ThemeKey
  logo_path: string | null
  class_logo_path: string | null
  cover_path: string | null
  term1_start: string | null
  term1_end: string | null
  term2_start: string | null
  term2_end: string | null
}

export type SettingsFlags = {
  require_approval: boolean
  reserve_on_request: boolean
  only_enough: boolean
  feature_missions: boolean
  feature_random: boolean
  feature_display: boolean
  feature_rewards: boolean
  student_can_view_profile: boolean
  student_can_view_history: boolean
  student_can_view_rank: boolean
  student_can_view_rewards: boolean
  student_can_view_timetable: boolean
  student_can_view_news: boolean
  student_can_view_attendance: boolean
  timetable_saturday: boolean
  weekly_redeem_limit: number
  star_steps: number[]
}

export type SettingsData = { cls: SettingsClass; settings: SettingsFlags; saturdaySlots: number }

const CLASS_COLUMNS = 'school_name, class_name, brand_title, school_year, teacher_name, slogan, theme, logo_path, class_logo_path, cover_path, term1_start, term1_end, term2_start, term2_end'
const SETTINGS_COLUMNS =
  'require_approval, reserve_on_request, only_enough, feature_missions, feature_random, feature_display, feature_rewards, student_can_view_profile, student_can_view_history, student_can_view_rank, student_can_view_rewards, student_can_view_timetable, student_can_view_news, student_can_view_attendance, timetable_saturday, weekly_redeem_limit, star_steps'

export async function getSettingsData(classId: string): Promise<SettingsData> {
  const supabase = await createServerSupabase()
  const [cls, settings, slots] = await Promise.all([
    supabase.from('classes').select(CLASS_COLUMNS).eq('id', classId).single(),
    supabase.from('class_settings').select(SETTINGS_COLUMNS).eq('class_id', classId).single(),
    supabase
      .from('timetable_slots')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('weekday', 6),
  ])
  if (cls.error) throw new Error(cls.error.message)
  if (settings.error) throw new Error(settings.error.message)
  if (slots.error) throw new Error(slots.error.message)
  return {
    cls: cls.data as SettingsClass,
    settings: settings.data as SettingsFlags,
    saturdaySlots: slots.count ?? 0,
  }
}
