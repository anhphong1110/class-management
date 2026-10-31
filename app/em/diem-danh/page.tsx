import { attendanceDayLabel, attendanceStats, ATTENDANCE_STATUS } from '@/lib/student/attendance'
import { getMyAttendance, requireStudentPage } from '@/lib/student/queries'

const RECENT = 10

export default async function AttendancePage() {
  const ctx = await requireStudentPage('att')
  const rows = await getMyAttendance(ctx)
  const s = attendanceStats(rows)
  const stats = [
    { label: 'Tỉ lệ chuyên cần', value: s.rate === null ? '—' : `${s.rate}%`, color: '#0B5A4D' },
    { label: 'Số buổi vắng', value: String(s.absent), color: '#8E1B3B' },
    { label: 'Số buổi đi trễ', value: String(s.late), color: '#6E4700' },
    { label: 'Vắng có phép', value: String(s.excused), color: '#1F4C9E' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {stats.map((x) => (
          <div key={x.label} data-testid="att-stat" className="rounded-[22px] bg-white px-5 py-4 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
            <div className="text-sm font-bold text-muted">{x.label}</div>
            <div className="font-display text-[32px] font-extrabold leading-[1.1]" style={{ color: x.color }}>
              {x.value}
            </div>
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-2.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]" aria-labelledby="att-h">
        <h2 id="att-h" className="m-0 font-display text-[22px] font-extrabold">
          Điểm danh của em
        </h2>
        <div className="text-[13.5px] text-muted">Trang này chỉ hiện khi cô giáo bật quyền xem.</div>
        {rows.length === 0 && <p className="m-0 font-bold text-muted">Em chưa có buổi điểm danh nào.</p>}
        {rows.slice(0, RECENT).map((r) => {
          const st = ATTENDANCE_STATUS[r.status] ?? ATTENDANCE_STATUS.present
          return (
            <div key={r.date} data-testid="att-day" className="flex items-center gap-3 rounded-[14px] bg-bg px-3.5 py-2.5">
              <span className="flex-1 text-[15px] font-bold">{attendanceDayLabel(r.date)}</span>
              <span className="rounded-full px-3.5 py-1 text-[12.5px] font-extrabold" style={{ background: st.bg, color: st.ink }}>
                {st.label}
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
