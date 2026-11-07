'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { PERIODS, WEEKDAY_LABELS, slotKey, weekdays, type Session } from '@/lib/timetable/layout'
import { paletteFor } from '@/lib/timetable/palette'
import type { TimetableSubject } from '@/lib/timetable/queries'
import { addSubject, cycleSubjectColor, deleteSubject, exportTimetable, renameSubject, setSlot } from './actions'

type View = 'week' | 'day'
type Edit = { weekday: number; session: Session; period: number }

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
  const [slotMsg, setSlotMsg] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [deleting, setDeleting] = useState<TimetableSubject | null>(null)
  const [pending, startTransition] = useTransition()

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const days = view === 'week' ? allDays : [day]
  const cols = `84px ${days.map(() => 'minmax(0,1fr)').join(' ')}`
  const label = (e: Edit) =>
    `${WEEKDAY_LABELS[e.weekday]}, ${e.session === 'morning' ? 'sáng' : 'chiều'} tiết ${e.period}`

  function run(action: () => Promise<{ error?: string }>, opts: { onOk?: () => void; onErr?: () => void; panel?: boolean } = {}) {
    startTransition(async () => {
      const res = await action()
      if (res.error) {
        if (opts.panel) setSlotMsg(res.error)
        else setMsg(res.error)
        opts.onErr?.()
      } else {
        setMsg('')
        setSlotMsg('')
        opts.onOk?.()
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
      <style>{`@page{size:landscape;margin:10mm}@media print{[data-testid=teacher-shell]>div:first-child,main>header{display:none!important}[data-testid=teacher-shell]{display:block;padding:0}#timetable-print{box-shadow:none;border:0;padding:0}#timetable-print [data-testid=timetable-scroll]{overflow:visible}#timetable-print [data-testid=timetable-inner]{min-width:0!important}}`}</style>

      <Card className="flex flex-wrap items-center justify-between gap-3 !py-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          {([['week', 'Cả tuần'], ['day', 'Theo ngày']] as const).map(([k, text]) => (
            <Button key={k} variant={view === k ? 'primary' : 'secondary'} aria-pressed={view === k} onClick={() => setView(k)}>
              {text}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {allDays.includes(todayWeekday) && (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-primary-deep">
              <Icon d={ICONS.star} size={18} />
              Hôm nay là {WEEKDAY_LABELS[todayWeekday]}
            </span>
          )}
          <Button variant="secondary" aria-expanded={showExport} onClick={() => setShowExport((v) => !v)}>
            In / Xuất
          </Button>
        </div>
      </Card>

      {showExport && (
        <Card className="flex flex-wrap gap-2.5 !py-4 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}>
            In thời khóa biểu
          </Button>
          <Button variant="secondary" loading={pending} onClick={exportFile}>
            Tải Excel (.xlsx)
          </Button>
        </Card>
      )}

      {view === 'day' && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {allDays.map((d) => (
            <Button
              key={d}
              variant={day === d ? 'primary' : 'secondary'}
              className="!rounded-full"
              aria-pressed={day === d}
              onClick={() => setDay(d)}
            >
              {WEEKDAY_LABELS[d]}
              {d === todayWeekday && <Icon d={ICONS.star} size={16} />}
            </Button>
          ))}
        </div>
      )}

      {edit && (
        <div
          role="region"
          aria-label="Sửa tiết học"
          className="clay-card flex flex-wrap items-center justify-between gap-3 !border-primary-strong bg-primary-soft px-[18px] py-3.5 print:hidden"
        >
          <div className="text-[15.5px] font-extrabold">Đang sửa: {label(edit)}</div>
          {slotMsg && (
            <div className="basis-full">
              <Notice tone="error">{slotMsg}</Notice>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 text-sm font-bold">
              Môn học
              <Select
                aria-label="Chọn môn học"
                value={current}
                disabled={pending}
                onChange={(e) =>
                  run(() => setSlot(edit.weekday, edit.session, edit.period, e.target.value || null), { panel: true })
                }
                className="!min-h-11 !w-auto"
              >
                <option value="">— Trống —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <Button
              onClick={() => {
                setEdit(null)
                setSlotMsg('')
              }}
            >
              Xong
            </Button>
          </div>
        </div>
      )}

      <Card id="timetable-print" data-testid="timetable-grid" className="!p-5">
        {view === 'week' && (
          <p className="m-0 mb-3 flex items-center gap-1.5 text-sm font-bold text-muted md:hidden print:hidden">
            <Icon d="M5 12h14M13 6l6 6-6 6" size={16} />
            Vuốt ngang để xem đủ các ngày
          </p>
        )}
        <div data-testid="timetable-scroll" className="overflow-x-auto">
          <div data-testid="timetable-inner" className="flex flex-col gap-2" style={{ minWidth: view === 'week' ? (saturday ? 880 : 760) : 320 }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: cols }}>
              <div className="rounded-ctl px-1.5 py-2.5 text-center font-display text-base font-extrabold text-muted">Tiết</div>
              {days.map((d) => {
                const isToday = d === todayWeekday
                return (
                  <div
                    key={d}
                    data-testid="day-head"
                    data-today={isToday}
                    aria-current={isToday ? 'date' : undefined}
                    className={`flex items-center justify-center gap-1.5 rounded-ctl px-1.5 py-2.5 text-center font-display text-base font-extrabold ${isToday ? 'bg-primary-strong text-white' : 'bg-primary-soft text-primary-deep'}`}
                  >
                    {isToday && <Icon d={ICONS.star} size={16} />}
                    {WEEKDAY_LABELS[d]}
                  </div>
                )
              })}
            </div>
            {PERIODS.map(({ session, period }, i) => (
              <div key={`${session}-${period}`} className="flex flex-col gap-2">
                {(i === 0 || i === 5) && (
                  <div className="rounded-xl bg-primary-soft p-1.5 text-center text-[13px] font-extrabold tracking-[.1em] text-primary-ink">
                    {i === 0 ? 'BUỔI SÁNG · 5 TIẾT' : 'BUỔI CHIỀU'}
                  </div>
                )}
                <div data-testid="period-row" className="grid gap-2" style={{ gridTemplateColumns: cols }}>
                  <div className="flex min-h-[60px] items-center justify-center rounded-ctl bg-field px-1 py-2 text-[15px] font-extrabold">
                    Tiết {period}
                  </div>
                  {days.map((d) => {
                    const subject = byId.get(slots[slotKey(d, session, period)] ?? '')
                    const pal = subject ? paletteFor(subject.color) : null
                    const on = edit?.weekday === d && edit.session === session && edit.period === period
                    const isToday = d === todayWeekday
                    const style: CSSProperties = {
                      background: pal?.bg ?? (isToday ? 'var(--primary-soft)' : '#F6F4FF'),
                      color: pal?.ink ?? 'var(--color-muted)',
                      borderColor: on ? 'var(--primary-strong)' : isToday ? 'var(--primary)' : 'transparent',
                    }
                    return (
                      <button
                        key={d}
                        type="button"
                        data-testid={`cell-${d}-${session}-${period}`}
                        aria-label={`${label({ weekday: d, session, period })}: ${subject?.name ?? 'trống'}`}
                        aria-pressed={on}
                        onClick={() => {
                          setEdit({ weekday: d, session, period })
                          setSlotMsg('')
                        }}
                        className="min-h-[60px] cursor-pointer rounded-ctl border-2 px-1.5 py-2 text-[15px] font-extrabold leading-tight transition-colors hover:brightness-95 motion-reduce:transition-none"
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
      </Card>

      <Card className="flex flex-col gap-3.5 print:hidden">
        <div>
          <h2 className="m-0 font-display text-[22px] font-extrabold">Danh sách môn học của lớp</h2>
          <div className="text-sm font-semibold text-muted">
            Cô đổi tên, đổi màu, thêm hoặc xóa môn. Môn đang có trong thời khóa biểu thì chưa xóa được.
          </div>
        </div>
        {msg && <Notice tone="info">{msg}</Notice>}
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
                  disabled={pending}
                  onClick={() => run(() => cycleSubjectColor(s.id))}
                  className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl border-2 disabled:opacity-50"
                  style={{ borderColor: pal.ink, background: pal.bg }}
                >
                  <span className="size-5 rounded-full" style={{ background: pal.ink }} />
                </button>
                <Input
                  key={`${s.id}-${s.name}`}
                  type="text"
                  defaultValue={s.name}
                  aria-label="Tên môn học"
                  maxLength={40}
                  readOnly={pending}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  onBlur={(e) => {
                    const input = e.currentTarget
                    const v = input.value.normalize('NFC').trim()
                    if (v === s.name) return
                    // Giữ chữ cô vừa gõ trong lúc lưu; chỉ trả về tên cũ khi lỗi.
                    // Khi lưu được, `key` đổi theo tên mới và ô dựng lại.
                    run(() => renameSubject(s.id, v), { onErr: () => { input.value = s.name } })
                  }}
                  className="!min-h-11 min-w-0 flex-1 !bg-white/70 !px-2.5 text-[15px] font-extrabold"
                  style={{ color: pal.ink }}
                />
                <Button
                  variant="ghost"
                  aria-label={`Xóa môn ${s.name}`}
                  disabled={pending}
                  onClick={() => setDeleting(s)}
                  className="!w-11 flex-none !px-0 text-danger-deep hover:!bg-danger-soft hover:!text-danger-deep"
                >
                  <Icon d={ICONS.trash} size={19} />
                </Button>
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Tên môn mới" className="flex-[1_1_240px]">
            {(a) => (
              <Input
                {...a}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('add-subject')?.click()}
                placeholder="Ví dụ: Công nghệ"
                maxLength={40}
              />
            )}
          </Field>
          <Button
            id="add-subject"
            size="lg"
            loading={pending}
            onClick={() => run(() => addSubject(newName), { onOk: () => setNewName('') })}
          >
            + Thêm môn
          </Button>
        </div>
      </Card>
      <div className="text-[15px] font-semibold text-muted print:hidden">Học sinh chỉ được xem.</div>

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa môn học này?"
        message={deleting ? `Môn "${deleting.name}" sẽ bị xóa khỏi danh sách môn của lớp.` : ''}
        confirmLabel="Xóa môn"
        danger
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const s = deleting
          if (!s) return
          setDeleting(null)
          run(() => deleteSubject(s.id))
        }}
      />
    </div>
  )
}
