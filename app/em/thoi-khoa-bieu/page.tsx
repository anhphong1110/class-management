import { weekdayInVietnam } from '@/lib/domain/date'
import { PERIODS, WEEKDAY_LABELS, slotKey, weekdays } from '@/lib/timetable/layout'
import { paletteFor } from '@/lib/timetable/palette'
import { getTimetable } from '@/lib/timetable/queries'
import { requireStudentPage } from '@/lib/student/queries'

export default async function TimetablePage() {
  const ctx = await requireStudentPage('tt')
  const tt = await getTimetable(ctx.classId)
  const days = weekdays(tt.saturday)
  const today = weekdayInVietnam()
  const subjects = new Map(tt.subjects.map((s) => [s.id, s]))
  const cols = `72px repeat(${days.length},minmax(0,1fr))`
  const sessions = [
    { session: 'morning' as const, title: 'BUỔI SÁNG' },
    { session: 'afternoon' as const, title: 'BUỔI CHIỀU' },
  ]
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
      <div className="overflow-x-auto">
        <div className="flex min-w-[620px] flex-col gap-2" role="table" aria-label="Thời khóa biểu">
          <div className="grid gap-2" style={{ gridTemplateColumns: cols }} role="row">
            <div />
            {days.map((d) => {
              const on = d === today
              return (
                <div
                  key={d}
                  role="columnheader"
                  data-today={on}
                  className="rounded-[14px] px-1.5 py-2.5 text-center font-display text-base font-extrabold"
                  style={{ background: on ? 'var(--primary-strong)' : 'var(--primary-soft)', color: on ? '#fff' : 'var(--primary-deep)' }}
                >
                  {WEEKDAY_LABELS[d]}
                </div>
              )
            })}
          </div>
          {sessions.map(({ session, title }) => (
            <div key={session} className="flex flex-col gap-2">
              <div className="rounded-xl bg-primary-soft p-1.5 text-center text-[13px] font-extrabold tracking-[.1em] text-primary-ink">{title}</div>
              {PERIODS.filter((p) => p.session === session).map((p) => (
                <div key={p.period} className="grid gap-2" style={{ gridTemplateColumns: cols }} role="row">
                  <div className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-bg text-sm font-extrabold">Tiết {p.period}</div>
                  {days.map((d) => {
                    const subject = subjects.get(tt.slots[slotKey(d, p.session, p.period)] ?? '')
                    const c = subject ? paletteFor(subject.color) : null
                    return (
                      <div
                        key={d}
                        role="cell"
                        className="flex min-h-[54px] items-center justify-center rounded-[14px] p-1.5 text-center text-sm font-extrabold"
                        style={{ background: c?.bg ?? '#F6F4FF', color: c?.ink ?? '#B9B5E8' }}
                      >
                        {subject?.name ?? ''}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
