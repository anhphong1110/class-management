'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import type { Status } from '@/lib/attendance/csv'
import { shouldConfirmLeave } from '@/lib/attendance/leave-guard'
import { saveAttendance } from './actions'
import { MonthCalendar, type CalendarDay } from './MonthCalendar'
import { CLOCK, X_CIRCLE } from './status-icons'

type Student = { id: string; code: string; fullName: string; avatar: AvatarValue }
type HistoryRow = { date: string; label: string; present: number; absent: number; excused: number; late: number }

// Mỗi trạng thái có icon + chữ (không chỉ màu). `on` là kiểu khi đang chọn, `ring` là viền thẻ học sinh.
// Trang học sinh dùng bảng màu nhạt cùng ý nghĩa ở lib/student/attendance.ts (ATTENDANCE_STATUS):
// đổi màu một nơi thì xem lại nơi kia.
const OPT: { key: Status; label: string; icon: string; on: string; ring: string }[] = [
  { key: 'present', label: 'Có mặt', icon: ICONS.checkCircle, on: 'border-success bg-success text-white', ring: 'border-success' },
  { key: 'absent_unexcused', label: 'Vắng không phép', icon: X_CIRCLE, on: 'border-danger bg-danger text-white', ring: 'border-danger' },
  { key: 'absent_excused', label: 'Vắng có phép', icon: ICONS.calendar, on: 'border-primary-strong bg-primary-strong text-white', ring: 'border-primary-strong' },
  { key: 'late', label: 'Đi trễ', icon: CLOCK, on: 'border-star-edge bg-star text-star-ink', ring: 'border-star-edge' },
]
const TEXT = Object.fromEntries(OPT.map((o) => [o.key, o.label])) as Record<Status, string>

const LEAVE_MESSAGE = 'Cô có thay đổi chưa lưu. Rời trang này sẽ mất các thay đổi đó.'
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const same = (a: Record<string, Status>, b: Record<string, Status>) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

export function AttendanceClient({
  date,
  today,
  month,
  dateLabel,
  isToday,
  students,
  initial,
  history,
  calendarDays,
}: {
  date: string
  today: string
  month: string
  dateLabel: string
  isToday: boolean
  students: Student[]
  initial: Record<string, Status>
  history: HistoryRow[]
  calendarDays: CalendarDay[]
}) {
  const router = useRouter()
  const [base, setBase] = useState<Record<string, Status>>(initial)
  const [st, setSt] = useState<Record<string, Status>>(initial)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [picking, setPicking] = useState(false)
  const [pending, startTransition] = useTransition()

  // Sau khi lưu, dữ liệu máy chủ làm mới: đồng bộ lại màn hình theo đúng những gì đang có trong cơ sở dữ liệu.
  const serverKey = JSON.stringify(initial)
  const [seenKey, setSeenKey] = useState(serverKey)
  if (seenKey !== serverKey) {
    setSeenKey(serverKey)
    setBase(initial)
    setSt(initial)
  }

  const dirty = !same(base, st)

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    // Chuyển trang trong ứng dụng (thanh bên, liên kết) không phát beforeunload nên chặn ở bước bấm.
    const c = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/"]') as HTMLAnchorElement | null
      if (!a || e.defaultPrevented || a.target === '_blank') return
      const to = new URL(a.href, window.location.href)
      if (!shouldConfirmLeave(to, new URL(window.location.href), today, e)) return
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', h)
    document.addEventListener('click', c, true)
    return () => {
      window.removeEventListener('beforeunload', h)
      document.removeEventListener('click', c, true)
    }
  }, [dirty, today])

  // Các liên kết trong trang đã được bộ chặn ở trên hỏi; chỉ còn việc đổi ngày bằng ô chọn ngày.
  const confirmLeave = () => !dirty || window.confirm(LEAVE_MESSAGE)

  function change(next: Record<string, Status>) {
    if (pending) return
    setSt(next)
    setNotice(null)
  }
  const set = (id: string, v: Status | null) => {
    if (pending) return
    const next = { ...st }
    if (v) next[id] = v
    else delete next[id]
    change(next)
  }

  function save() {
    // Gửi toàn bộ ảnh chụp màn hình: mọi học sinh đang học, status null = bỏ chọn (xóa dòng).
    const rows = students.map((s) => ({ studentId: s.id, status: st[s.id] ?? null }))
    startTransition(async () => {
      const res = await saveAttendance(date, rows)
      if (res.error) {
        setNotice({ tone: 'error', text: res.error })
        return
      }
      setBase(st)
      setNotice({ tone: 'success', text: `Đã lưu điểm danh ngày ${dmy(date)}.` })
      router.refresh()
    })
  }

  function pickDate(v: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v === date) return
    if (!confirmLeave()) return
    router.push(`/diem-danh?ngay=${v}`)
  }

  const count = (k: Status) => students.filter((s) => st[s.id] === k).length
  const marked = students.filter((s) => st[s.id]).length
  const totals: [string, string, number, string, string][] = [
    ['all', 'Tổng số', students.length, 'text-ink', ICONS.users],
    ['present', 'Có mặt', count('present'), 'text-success-deep', ICONS.checkCircle],
    ['absent', 'Vắng', count('absent_unexcused'), 'text-danger-deep', X_CIRCLE],
    ['late', 'Đi trễ', count('late'), 'text-star-ink', CLOCK],
    ['excused', 'Có phép', count('absent_excused'), 'text-primary-deep', ICONS.calendar],
    ['unmarked', 'Chưa điểm danh', students.length - marked, 'text-muted', ICONS.minus],
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="clay-card flex flex-wrap items-center justify-between gap-3.5 px-6 py-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-14 items-center justify-center rounded-[18px] bg-primary-soft text-primary-ink">
            <Icon d={ICONS.calendar} size={28} />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-muted">Ngày điểm danh</div>
            <div className="font-display text-[26px] font-extrabold leading-[1.15]">{dateLabel}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {picking && (
            <label className="flex items-center gap-2 text-sm font-bold text-muted">
              <span className="sr-only">Chọn ngày điểm danh</span>
              <Input
                type="date"
                aria-label="Chọn ngày điểm danh"
                value={date}
                max={today}
                onChange={(e) => pickDate(e.target.value)}
                className="!min-h-11 !w-auto"
              />
            </label>
          )}
          <Button variant="secondary" onClick={() => setPicking((p) => !p)}>
            Chọn ngày
          </Button>
          <Button variant="secondary" onClick={() => change({})} disabled={pending}>
            Bỏ chọn hết
          </Button>
        </div>
      </div>

      <div className="clay-card flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={pending}
            onClick={() => {
              const next: Record<string, Status> = {}
              for (const s of students) next[s.id] = 'present'
              change(next)
            }}
            className="!bg-success [--edge:var(--color-success-deep)] hover:!bg-success-deep"
          >
            <Icon d={ICONS.checkCircle} size={22} />
            Tất cả có mặt
          </Button>
          <span data-testid="save-state">
            {dirty ? (
              <Badge tone="star">
                <Icon d={ICONS.alert} size={14} />
                Có thay đổi chưa lưu
              </Badge>
            ) : marked > 0 ? (
              <Badge tone="success">
                <Icon d={ICONS.check} size={14} />
                Đã lưu
              </Badge>
            ) : (
              <Badge>Chưa điểm danh ngày này</Badge>
            )}
          </span>
        </div>
        <Button size="lg" onClick={save} disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu điểm danh'}
        </Button>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      {students.length === 0 ? (
        <EmptyState title="Lớp chưa có học sinh" icon={ICONS.users}>
          Cô thêm học sinh ở trang Quản lý học sinh rồi quay lại điểm danh nhé.
        </EmptyState>
      ) : null}

      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-3 p-0">
        {students.map((s) => {
          const cur = st[s.id] ?? null
          const curOpt = OPT.find((o) => o.key === cur)
          return (
            <li
              key={s.id}
              data-testid={`att-card-${s.code}`}
              className={`flex flex-col gap-2.5 rounded-[22px] border-2 bg-white px-4 py-3.5 shadow-[0_4px_0_var(--primary-edge)] ${curOpt?.ring ?? 'border-edge'}`}
            >
              <div className="flex items-center gap-3">
                <AvatarImage avatar={s.avatar} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="text-[16.5px] font-extrabold">{s.fullName}</div>
                  <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-muted">
                    <Icon d={curOpt?.icon ?? ICONS.minus} size={16} />
                    <span>
                      {s.code} · <span data-testid={`att-status-${s.code}`}>{cur ? TEXT[cur] : 'Chưa điểm danh'}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {OPT.map((o) => {
                  const on = cur === o.key
                  return (
                    <button
                      key={o.key}
                      type="button"
                      aria-pressed={on}
                      disabled={pending}
                      onClick={() => set(s.id, on ? null : o.key)}
                      className={`inline-flex min-h-11 flex-[1_1_120px] items-center justify-center gap-1.5 rounded-[14px] border-2 px-2.5 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        on ? o.on : 'border-edge bg-white text-ink hover:bg-primary-soft'
                      }`}
                    >
                      <Icon d={o.icon} size={18} />
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      <section className="clay-card flex flex-wrap items-center justify-between gap-x-7 gap-y-4 bg-primary-soft px-6 py-5">
        <h2 className="m-0 font-display text-[22px] font-extrabold">{isToday ? 'Tổng kết hôm nay' : `Tổng kết ngày ${dmy(date).slice(0, 5)}`}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {totals.map(([key, label, value, color, icon]) => (
            <div key={key} className="flex min-w-[76px] flex-col items-center">
              <div data-testid={`total-${key}`} className={`font-display text-[30px] font-extrabold leading-[1.1] ${color}`}>
                {value}
              </div>
              <div className={`flex items-center gap-1 text-[13px] font-extrabold ${color}`}>
                <Icon d={icon} size={14} />
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="clay-card flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Lịch sử điểm danh theo ngày</h2>
          <span className="text-[13.5px] font-semibold text-muted">Cô có thể chỉnh lại các ngày trước</span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[560px] flex-col gap-2">
            {history.length === 0 && <p className="m-0 text-sm font-semibold text-muted">Chưa có ngày nào được điểm danh.</p>}
            {history.map((h) => (
              <div
                key={h.date}
                data-testid={`history-${h.date}`}
                className="grid grid-cols-[1.6fr_repeat(4,1fr)_1fr] items-center gap-2 rounded-[14px] bg-bg px-3.5 py-1.5 text-[14.5px] font-bold"
              >
                <div>{h.label}</div>
                <div className="text-success-deep">{h.present} có mặt</div>
                <div className="text-danger-deep">{h.absent} vắng</div>
                <div className="text-primary-deep">{h.excused} có phép</div>
                <div className="text-star-ink">{h.late} đi trễ</div>
                <Link
                  href={`/diem-danh?ngay=${h.date}`}
                  className="inline-flex min-h-11 items-center justify-end font-extrabold text-primary-strong underline-offset-2 hover:underline"
                >
                  Chỉnh sửa
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MonthCalendar month={month} selected={date} today={today} classSize={students.length} days={calendarDays} />
    </div>
  )
}
