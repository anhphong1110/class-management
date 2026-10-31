'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { PERIODS, WEEKDAY_LABELS, slotKey, weekdays, type Session } from '@/lib/timetable/layout'
import { paletteFor } from '@/lib/timetable/palette'
import type { TimetableSubject } from '@/lib/timetable/queries'
import { addSubject, cycleSubjectColor, deleteSubject, exportTimetable, renameSubject, setSlot } from './actions'

type View = 'week' | 'day'
type Edit = { weekday: number; session: Session; period: number }

const CARD = 'rounded-[28px] bg-white p-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]'
const GHOST_BTN =
  'min-h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-4 text-[14.5px] font-extrabold text-[#3441B5]'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function TimetableClient({
  subjects,
  slots,
  saturday,
  todayWeekday,
}: {
  subjects: TimetableSubject[]
  slots: Record<string, string | null>
  saturday: boolean
  /** 0 = Chủ Nhật (giờ Việt Nam). */
  todayWeekday: number
}) {
  const allDays = weekdays(saturday)
  const [view, setView] = useState<View>('week')
  const [day, setDay] = useState(allDays.includes(todayWeekday) ? todayWeekday : 1)
  const [edit, setEdit] = useState<Edit | null>(null)
  const [newName, setNewName] = useState('')
  const [msg, setMsg] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [pending, startTransition] = useTransition()

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const days = view === 'week' ? allDays : [day]
  const cols = `84px ${days.map(() => 'minmax(0,1fr)').join(' ')}`
  const label = (e: Edit) =>
    `${WEEKDAY_LABELS[e.weekday]}, ${e.session === 'morning' ? 'sáng' : 'chiều'} tiết ${e.period}`

  function run(action: () => Promise<{ error?: string }>, onOk?: () => void) {
    startTransition(async () => {
      const res = await action()
      if (res.error) setMsg(res.error)
      else {
        setMsg('')
        onOk?.()
      }
    })
  }

  function exportFile() {
    startTransition(async () => {
      const res = await exportTimetable()
      if (res.error || !res.base64 || !res.fileName) {
        setMsg(res.error ?? 'Có lỗi xảy ra, vui lòng thử lại.')
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
  }

  const current = edit ? (slots[slotKey(edit.weekday, edit.session, edit.period)] ?? '') : ''

  return (
    <div className="flex flex-col gap-5">
      <style>{`@media print{body *{visibility:hidden}#timetable-print,#timetable-print *{visibility:visible}#timetable-print{position:absolute;left:0;top:0;width:100%;box-shadow:none}}`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] bg-white px-6 py-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div className="flex flex-wrap gap-2">
          {([['week', 'Cả tuần'], ['day', 'Theo ngày']] as const).map(([k, text]) => {
            const on = view === k
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setView(k)}
                className="min-h-12 cursor-pointer rounded-[14px] border-2 px-[22px] text-[15px] font-extrabold"
                style={{ background: on ? '#4F5BD5' : '#fff', color: on ? '#fff' : '#3A3769', borderColor: on ? '#4F5BD5' : '#D9D5F2' }}
              >
                {text}
              </button>
            )
          })}
        </div>
        <button type="button" aria-expanded={showExport} onClick={() => setShowExport((v) => !v)} className={GHOST_BTN}>
          In / Xuất
        </button>
      </div>

      {showExport && (
        <div className="flex flex-wrap gap-2.5 rounded-[20px] bg-white px-5 py-4 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
          <button type="button" onClick={() => window.print()} className={GHOST_BTN}>
            In thời khóa biểu
          </button>
          <button type="button" disabled={pending} onClick={exportFile} className={GHOST_BTN}>
            Tải Excel (.xlsx)
          </button>
        </div>
      )}

      {view === 'day' && (
        <div className="flex flex-wrap gap-2">
          {allDays.map((d) => {
            const on = day === d
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setDay(d)}
                className="min-h-11 cursor-pointer rounded-full border-2 px-[18px] text-[14.5px] font-extrabold"
                style={{ background: on ? '#EEF0FF' : '#fff', color: on ? '#2C37A8' : '#3A3769', borderColor: on ? '#4F5BD5' : '#D9D5F2' }}
              >
                {WEEKDAY_LABELS[d]}
              </button>
            )
          })}
        </div>
      )}

      {edit && (
        <div
          role="region"
          aria-label="Sửa tiết học"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border-2 border-[#4F5BD5] bg-[#EEF0FF] px-[18px] py-3.5"
        >
          <div className="text-[15.5px] font-extrabold">Đang sửa: {label(edit)}</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 text-sm font-bold">
              Môn học
              <select
                aria-label="Chọn môn học"
                value={current}
                disabled={pending}
                onChange={(e) =>
                  run(() => setSlot(edit.weekday, edit.session, edit.period, e.target.value || null))
                }
                className="min-h-11 rounded-xl border-2 border-[#B9B5E8] bg-white px-3 text-[15px] font-bold text-[#231F4D]"
              >
                <option value="">— Trống —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setEdit(null)}
              className="min-h-11 cursor-pointer rounded-xl border-0 bg-[#4F5BD5] px-[18px] font-extrabold text-white"
            >
              Xong
            </button>
          </div>
        </div>
      )}

      <div id="timetable-print" data-testid="timetable-grid" className={CARD}>
        <div className="overflow-x-auto">
          <div className="flex flex-col gap-2" style={{ minWidth: view === 'week' ? (saturday ? 880 : 760) : 320 }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: cols }}>
              <div className="rounded-[14px] px-1.5 py-2.5 text-center font-display text-base font-extrabold text-[#5B5890]">Tiết</div>
              {days.map((d) => {
                const isToday = d === todayWeekday
                return (
                  <div
                    key={d}
                    data-testid="day-head"
                    data-today={isToday}
                    className="rounded-[14px] px-1.5 py-2.5 text-center font-display text-base font-extrabold"
                    style={{ background: isToday ? '#4F5BD5' : '#EEF0FF', color: isToday ? '#fff' : '#2C37A8' }}
                  >
                    {WEEKDAY_LABELS[d]}
                  </div>
                )
              })}
            </div>
            {PERIODS.map(({ session, period }, i) => (
              <div key={`${session}-${period}`} className="flex flex-col gap-2">
                {(i === 0 || i === 5) && (
                  <div className="rounded-xl bg-[#EEF0FF] p-1.5 text-center text-[13px] font-extrabold tracking-[.1em] text-[#3441B5]">
                    {i === 0 ? 'BUỔI SÁNG · 5 TIẾT' : 'BUỔI CHIỀU'}
                  </div>
                )}
                <div data-testid="period-row" className="grid gap-2" style={{ gridTemplateColumns: cols }}>
                  <div className="flex min-h-[60px] items-center justify-center rounded-[14px] bg-[#F6F4FF] px-1 py-2 text-[15px] font-extrabold">
                    Tiết {period}
                  </div>
                  {days.map((d) => {
                    const subject = byId.get(slots[slotKey(d, session, period)] ?? '')
                    const pal = subject ? paletteFor(subject.color) : null
                    const on = edit?.weekday === d && edit.session === session && edit.period === period
                    const style: CSSProperties = {
                      background: pal?.bg ?? '#F6F4FF',
                      color: pal?.ink ?? '#B9B5E8',
                      borderColor: on ? '#4F5BD5' : 'transparent',
                    }
                    return (
                      <button
                        key={d}
                        type="button"
                        data-testid={`cell-${d}-${session}-${period}`}
                        onClick={() => setEdit({ weekday: d, session, period })}
                        className="min-h-[60px] cursor-pointer rounded-[14px] border-2 px-1.5 py-2 text-[14.5px] font-extrabold leading-tight"
                        style={style}
                      >
                        {subject?.name ?? '—'}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[28px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div>
          <h2 className="m-0 font-display text-[22px] font-extrabold">Danh sách môn học của lớp</h2>
          <div className="text-sm text-[#5B5890]">
            Cô đổi tên, đổi màu, thêm hoặc xóa môn. Môn đang có trong thời khóa biểu thì chưa xóa được.
          </div>
        </div>
        {msg && (
          <div role="status" className="rounded-xl bg-[#FFF1CC] px-3.5 py-2.5 text-[14.5px] font-bold text-[#5E3E00]">
            {msg}
          </div>
        )}
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {subjects.map((s) => {
            const pal = paletteFor(s.color)
            return (
              <div
                key={s.id}
                data-testid="subject-row"
                className="flex items-center gap-2 rounded-2xl px-2.5 py-2"
                style={{ background: pal.bg }}
              >
                <button
                  type="button"
                  aria-label={`Đổi màu môn ${s.name}`}
                  onClick={() => run(() => cycleSubjectColor(s.id))}
                  className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl border-2"
                  style={{ borderColor: pal.ink, background: pal.bg }}
                >
                  <span className="size-5 rounded-full" style={{ background: pal.ink }} />
                </button>
                <input
                  key={`${s.id}-${s.name}`}
                  type="text"
                  defaultValue={s.name}
                  aria-label="Tên môn học"
                  maxLength={40}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  onBlur={(e) => {
                    const input = e.currentTarget
                    const v = input.value.trim()
                    if (v === s.name) return
                    run(
                      () => renameSubject(s.id, v),
                    )
                    // Trả ô về tên cũ; khi lưu được, `key` đổi theo tên mới và ô dựng lại.
                    input.value = s.name
                  }}
                  className="box-border min-h-11 min-w-0 flex-1 rounded-xl border-2 border-transparent bg-white/70 px-2.5 text-[15px] font-extrabold"
                  style={{ color: pal.ink }}
                />
                <button
                  type="button"
                  aria-label={`Xóa môn ${s.name}`}
                  onClick={() => run(() => deleteSubject(s.id))}
                  className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[#9E2257]"
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-subject')?.click()}
            placeholder="Tên môn mới, ví dụ: Công nghệ"
            aria-label="Tên môn mới"
            maxLength={40}
            className="box-border min-h-12 flex-[1_1_240px] rounded-[14px] border-2 border-[#D9D5F2] px-3.5 text-base font-semibold text-[#231F4D]"
          />
          <button
            id="add-subject"
            type="button"
            disabled={pending}
            onClick={() => run(() => addSubject(newName), () => setNewName(''))}
            className="min-h-12 cursor-pointer rounded-[14px] border-0 bg-[#4F5BD5] px-[22px] text-[15px] font-extrabold text-white"
          >
            + Thêm môn
          </button>
        </div>
      </div>
      <div className="text-[13.5px] text-[#5B5890]">Học sinh chỉ được xem.</div>
    </div>
  )
}
