import { EmptyState } from '@/components/ui/EmptyState'
import { ICONS } from '@/components/ui/Icon'
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
  const hasAny = Object.values(tt.slots).some(Boolean)
  if (!hasAny) {
    return (
      <EmptyState title="Cô chưa xếp thời khóa biểu." icon={ICONS.calendar}>
        Khi cô xếp xong, lịch học của em sẽ hiện ở đây nhé.
      </EmptyState>
    )
  }
  return (
    <div className="clay-card p-5 max-sm:p-3">
      <p className="m-0 mb-3 text-base font-semibold text-muted md:hidden">Vuốt sang ngang để xem đủ các ngày. Cột đậm là hôm nay.</p>
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
                  className={`rounded-[14px] px-1.5 py-2.5 text-center font-display text-lg font-extrabold leading-tight ${
                    on ? 'bg-primary-strong text-white' : 'bg-primary-soft text-primary-deep'
                  }`}
                >
                  {WEEKDAY_LABELS[d]}
                  {on && <span className="block text-[14px] font-bold">Hôm nay</span>}
                </div>
              )
            })}
          </div>
          {sessions.map(({ session, title }) => (
            <div key={session} className="flex flex-col gap-2">
              <div className="rounded-xl bg-primary-soft p-1.5 text-center text-base font-extrabold tracking-[.1em] text-primary-ink">{title}</div>
              {PERIODS.filter((p) => p.session === session).map((p) => (
                <div key={p.period} className="grid gap-2" style={{ gridTemplateColumns: cols }} role="row">
                  <div className="flex min-h-14 items-center justify-center rounded-[14px] bg-bg text-base font-extrabold">Tiết {p.period}</div>
                  {days.map((d) => {
                    const subject = subjects.get(tt.slots[slotKey(d, p.session, p.period)] ?? '')
                    const c = subject ? paletteFor(subject.color) : null
                    return (
                      <div
                        key={d}
                        role="cell"
                        className={`flex min-h-14 items-center justify-center rounded-[14px] p-1.5 text-center text-base font-extrabold leading-tight ${c ? '' : 'bg-bg'}`}
                        style={c ? { background: c.bg, color: c.ink } : undefined}
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
