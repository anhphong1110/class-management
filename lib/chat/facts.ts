import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { getTimetable } from '@/lib/timetable/queries'
import { WEEKDAYS, formatVietnameseDate } from '@/lib/domain/date'
import { periodRange } from '@/lib/domain/period'
import { weekdays } from '@/lib/timetable/layout'
import type { SessionUser } from '@/lib/domain/types'
import { formatClassStars, scheduleLines, type RewardData, type TimetableData } from '@/lib/chat/format'
import type { ChatFlags } from '@/lib/chat/suggestions'

const NO_TERMS = { term1Start: '', term1End: '', term2Start: '', term2End: '' }

export type ClassFacts = {
  today: string
  className: string
  schoolName: string
  schoolYear: string
  terms: { term1Start: string | null; term1End: string | null; term2Start: string | null; term2End: string | null }
  classSize: number | null
  timetable: { slots: TimetableData['slots']; saturday: boolean; subjects: { id: string; name: string; usedCount: number }[] } | null
  rewards: RewardData[] | null
  weekStars: { awarded: number; penalized: number } | null
}

const viDate = (iso: string) => iso.split('-').reverse().join('/')

/**
 * Chuyển dữ liệu chung của lớp thành văn bản ngắn để đưa cho AI.
 * Cố ý không có chỗ nào cho tên cô giáo, tên học sinh hay nội dung thông báo.
 */
export function renderFacts(f: ClassFacts): string {
  const lines = [`Hôm nay: ${f.today}.`]

  const klass = [f.className && `Lớp ${f.className}`, f.schoolName, f.schoolYear && `năm học ${f.schoolYear}`].filter(Boolean)
  if (klass.length) lines.push(`${klass.join(', ')}.`)

  const terms = [
    f.terms.term1Start && f.terms.term1End ? `Học kỳ 1: ${viDate(f.terms.term1Start)} đến ${viDate(f.terms.term1End)}.` : null,
    f.terms.term2Start && f.terms.term2End ? `Học kỳ 2: ${viDate(f.terms.term2Start)} đến ${viDate(f.terms.term2End)}.` : null,
  ].filter(Boolean)
  if (terms.length) lines.push(terms.join(' '))

  if (f.classSize !== null) lines.push(`Sĩ số: ${f.classSize} học sinh.`)

  if (f.timetable) {
    const counts = f.timetable.subjects.filter((s) => s.usedCount > 0).map((s) => `${s.name} ${s.usedCount}`)
    if (counts.length) lines.push(`Số tiết mỗi tuần: ${counts.join(', ')}.`)
    const days = weekdays(f.timetable.saturday).flatMap((d) => {
      const parts = scheduleLines(d, f.timetable!)
      return parts.length ? [`${WEEKDAYS[d]}: ${parts.join('; ')}`] : []
    })
    if (days.length) lines.push('Thời khóa biểu:', ...days)
  }

  if (f.rewards) {
    lines.push(
      f.rewards.length
        ? `Quà: ${f.rewards.map((r) => `${r.name} (${r.cost} sao, ${r.left > 0 ? `còn ${r.left}` : 'hết'})`).join('; ')}.`
        : 'Quà: hiện chưa có quà nào.',
    )
  }

  if (f.weekStars) lines.push(formatClassStars('week', f.weekStars))
  return lines.join('\n')
}

/** Một phần dữ liệu lỗi thì bỏ phần đó, không làm hỏng cả câu trả lời. */
async function orNull<T>(p: PromiseLike<T>): Promise<T | null> {
  try {
    return await p
  } catch {
    return null
  }
}

/**
 * Dựng dữ liệu chung của lớp bằng phiên của người dùng, nên RLS và cờ cài đặt lớp tự giới hạn phần học sinh
 * được xem. Không đọc tên cô giáo, tên học sinh hay thông báo.
 */
export async function buildClassFacts(user: SessionUser, flags: ChatFlags, now: Date = new Date()): Promise<string> {
  const supabase = await createServerSupabase()
  const isTeacher = user.role === 'teacher'

  const [cls, classSize, timetable, rewards, weekStars] = await Promise.all([
    orNull(
      supabase
        .from('classes')
        .select('class_name, school_name, school_year, term1_start, term1_end, term2_start, term2_end')
        .eq('id', user.classId)
        .maybeSingle(),
    ),
    orNull(
      isTeacher
        ? supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', user.classId)
            .is('archived_at', null)
            .then((r) => (r.error ? null : (r.count ?? 0)))
        : supabase.rpc('my_profile_summary').then((r) => (r.error ? null : ((r.data?.[0]?.class_size as number | null | undefined) ?? null))),
    ),
    flags.timetable ? orNull(getTimetable(user.classId)) : Promise.resolve(null),
    flags.rewards
      ? orNull(
          supabase.rpc('reward_availability').then((r) =>
            r.error ? null : ((r.data ?? []) as { name: string; cost: number; left_count: number }[]).map((x) => ({ name: x.name, cost: x.cost, left: x.left_count })),
          ),
        )
      : Promise.resolve(null),
    isTeacher
      ? orNull(
          (async () => {
            const { from, to } = periodRange('week', now, NO_TERMS)
            const { data, error } = await supabase.rpc('class_star_totals_between', { p_from: from!, p_to: to! })
            if (error) return null
            return { awarded: Number(data?.[0]?.awarded ?? 0), penalized: Number(data?.[0]?.penalized ?? 0) }
          })(),
        )
      : Promise.resolve(null),
  ])

  const c = cls?.data
  return renderFacts({
    today: formatVietnameseDate(now),
    className: c?.class_name ?? '',
    schoolName: c?.school_name ?? '',
    schoolYear: c?.school_year ?? '',
    terms: { term1Start: c?.term1_start ?? null, term1End: c?.term1_end ?? null, term2Start: c?.term2_start ?? null, term2End: c?.term2_end ?? null },
    classSize: classSize ?? null,
    timetable: timetable
      ? { slots: timetable.slots, saturday: timetable.saturday, subjects: timetable.subjects.map((s) => ({ id: s.id, name: s.name, usedCount: s.usedCount })) }
      : null,
    rewards,
    weekStars,
  })
}
