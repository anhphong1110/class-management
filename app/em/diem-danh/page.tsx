import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { StatCard } from '@/components/ui/StatCard'
import { attendanceDayLabel, attendanceStats, ATTENDANCE_STATUS } from '@/lib/student/attendance'
import { getMyAttendance, requireStudentPage } from '@/lib/student/queries'

const RECENT = 10
const CLOCK = 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18'

/** Icon đi kèm chữ của từng trạng thái điểm danh. */
const STATUS_ICON: Record<string, string> = {
  present: ICONS.checkCircle,
  late: CLOCK,
  absent_excused: ICONS.calendar,
  absent_unexcused: ICONS.x,
}

export default async function AttendancePage() {
  const ctx = await requireStudentPage('att')
  const rows = await getMyAttendance(ctx)
  const s = attendanceStats(rows)
  const stats = [
    { label: 'Tỉ lệ chuyên cần', value: s.rate === null ? '—' : `${s.rate}%`, icon: ICONS.checkCircle, tone: 'mint' as const },
    { label: 'Số buổi vắng', value: String(s.absent), icon: ICONS.x, tone: 'pink' as const },
    { label: 'Số buổi đi trễ', value: String(s.late), icon: CLOCK, tone: 'star' as const },
    { label: 'Vắng có phép', value: String(s.excused), icon: ICONS.calendar, tone: 'blue' as const },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        {stats.map((x) => (
          <div key={x.label} data-testid="att-stat" className="contents">
            <StatCard icon={x.icon} tone={x.tone} value={x.value} label={x.label} />
          </div>
        ))}
      </div>
      <section className="clay-card flex flex-col gap-3 px-6 py-[22px] max-sm:px-4" aria-labelledby="att-h">
        <h2 id="att-h" className="m-0 font-display text-[22px] font-extrabold">
          Điểm danh của em
        </h2>
        <div className="text-base font-semibold text-muted">Trang này chỉ hiện khi cô giáo bật quyền xem.</div>
        {rows.length === 0 && (
          <EmptyState title="Em chưa có buổi điểm danh nào." icon={ICONS.calendar}>
            Khi cô điểm danh, kết quả sẽ hiện ở đây.
          </EmptyState>
        )}
        {rows.slice(0, RECENT).map((r) => {
          const st = ATTENDANCE_STATUS[r.status] ?? ATTENDANCE_STATUS.present
          const icon = STATUS_ICON[r.status] ?? STATUS_ICON.present
          return (
            <div key={r.date} data-testid="att-day" className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-bg px-4 py-2.5">
              <span className="min-w-0 flex-1 text-base font-bold">{attendanceDayLabel(r.date)}</span>
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-extrabold" style={{ background: st.bg, color: st.ink }}>
                <Icon d={icon} size={16} />
                {st.label}
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
