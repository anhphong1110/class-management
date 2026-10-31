export type AttendanceCounts = Record<'present' | 'late' | 'absent_excused' | 'absent_unexcused', number>

export type OverviewStatsInput = {
  studentCount: number
  attendanceToday: AttendanceCounts
  weekAwarded: number
  weekPenalized: number
  redeemedCount: number
  pendingRewards: number
  starsOver100: number
}

export type OverviewStat = { label: string; value: string; sub: string }

export function buildOverviewStats(i: OverviewStatsInput): OverviewStat[] {
  const a = i.attendanceToday
  const taken = a.present + a.late + a.absent_excused + a.absent_unexcused > 0
  const absent = a.absent_excused + a.absent_unexcused
  const absentSub =
    a.absent_excused > 0 && a.absent_unexcused > 0
      ? `${a.absent_excused} có phép, ${a.absent_unexcused} không phép`
      : a.absent_unexcused > 0
        ? 'vắng không phép'
        : 'vắng có phép'
  return [
    { label: 'Tổng số học sinh', value: String(i.studentCount), sub: 'đang học trong lớp' },
    taken
      ? { label: 'Có mặt hôm nay', value: `${a.present + a.late}/${i.studentCount}`, sub: `${a.late} bạn đi trễ` }
      : { label: 'Có mặt hôm nay', value: '—', sub: 'Chưa điểm danh' },
    taken
      ? { label: 'Vắng hôm nay', value: String(absent), sub: absentSub }
      : { label: 'Vắng hôm nay', value: '—', sub: 'Chưa điểm danh' },
    { label: 'Sao thi đua tuần này', value: `+${i.weekAwarded}`, sub: `đã trừ ${i.weekPenalized} sao` },
    { label: 'Lượt đổi quà', value: String(i.redeemedCount), sub: `${i.pendingRewards} yêu cầu chờ duyệt` },
    { label: 'Học sinh nổi bật', value: String(i.starsOver100), sub: 'đạt mốc 100 sao' },
  ]
}

export type WeekRow = { kind: string; delta: number; originalKind?: string | null }

/** Cộng/trừ ròng trong tuần: dòng hoàn tác trừ ngược vào nhóm (cộng/trừ) của dòng gốc. */
export function sumWeekStars(rows: WeekRow[]): { awarded: number; penalized: number } {
  let awarded = 0
  let penalized = 0
  for (const r of rows) {
    const bucket = r.kind === 'reversal' ? r.originalKind : r.kind
    if (bucket === 'award') awarded += r.delta
    else if (bucket === 'penalty') penalized -= r.delta
  }
  return { awarded: Math.max(0, awarded), penalized: Math.max(0, penalized) }
}

const TITLES = new Set(['cô', 'thầy'])

/** "Cô Khanh" -> "cô Khanh", "Thầy Nam" -> "thầy Nam"; không có danh xưng thì ghép "cô " phía trước. */
export function teacherGreetingName(teacherName: string): string {
  const name = teacherName.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (!name) return 'cô'
  const [first, ...rest] = name.split(' ')
  if (TITLES.has(first.toLowerCase())) return [first.toLowerCase(), ...rest].join(' ')
  return `cô ${name}`
}
