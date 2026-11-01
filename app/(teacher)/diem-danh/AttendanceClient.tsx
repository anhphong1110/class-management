'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Notice } from '@/components/ui/Notice'
import type { Status } from '@/lib/attendance/csv'
import { shouldConfirmLeave } from '@/lib/attendance/leave-guard'
import { saveAttendance } from './actions'
import { MonthCalendar, type CalendarDay } from './MonthCalendar'

type Student = { id: string; code: string; fullName: string; avatar: AvatarValue }
type HistoryRow = { date: string; label: string; present: number; absent: number; excused: number; late: number }

// [trạng thái, nhãn, nền, chữ] theo thiết kế. Trang học sinh dùng bảng màu nhạt cùng ý nghĩa ở
// lib/student/attendance.ts (ATTENDANCE_STATUS): đổi màu một nơi thì xem lại nơi kia.
const OPT: [Status, string, string, string][] = [
  ['present', 'Có mặt', '#12794F', '#FFFFFF'],
  ['absent_unexcused', 'Vắng không phép', '#C0314E', '#FFFFFF'],
  ['absent_excused', 'Vắng có phép', '#2563C9', '#FFFFFF'],
  ['late', 'Đi trễ', '#FFC857', '#4A3300'],
]
const TEXT = Object.fromEntries(OPT.map(([k, label]) => [k, label])) as Record<Status, string>

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
  const totals: [string, string, number, string][] = [
    ['all', 'Tổng số', students.length, '#FFFFFF'],
    ['present', 'Có mặt', count('present'), '#7FE3B5'],
    ['absent', 'Vắng', count('absent_unexcused'), '#FF9DB5'],
    ['late', 'Đi trễ', count('late'), '#FFD36B'],
    ['excused', 'Có phép', count('absent_excused'), '#A9C6FF'],
    ['unmarked', 'Chưa điểm danh', students.length - marked, '#FFFFFF'],
  ]

  const outline =
    'min-h-11 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-[18px] text-[15px] font-extrabold'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-[26px] bg-white px-6 py-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div className="flex items-center gap-3.5">
          <div className="flex size-14 items-center justify-center rounded-[18px] bg-primary-soft text-primary-ink">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
            </svg>
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-muted">Ngày điểm danh</div>
            <div className="font-display text-[26px] font-extrabold leading-[1.15]">{dateLabel}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {picking && (
            <label className="flex items-center gap-2 text-sm font-bold text-[#4A476E]">
              <span className="sr-only">Chọn ngày điểm danh</span>
              <input
                type="date"
                aria-label="Chọn ngày điểm danh"
                value={date}
                max={today}
                onChange={(e) => pickDate(e.target.value)}
                className="min-h-11 rounded-[14px] border-[1.5px] border-[#D9D5F2] px-3 font-body text-[15px]"
              />
            </label>
          )}
          <button type="button" onClick={() => setPicking((p) => !p)} className={`${outline} text-primary-ink`}>
            Chọn ngày
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const next: Record<string, Status> = {}
              for (const s of students) next[s.id] = 'present'
              change(next)
            }}
            className="min-h-11 cursor-pointer rounded-[14px] border-0 bg-[#12794F] px-5 text-[15px] font-extrabold text-white disabled:opacity-60"
          >
            Tất cả có mặt
          </button>
          <button type="button" onClick={() => change({})} disabled={pending} className={`${outline} text-[#4A476E] disabled:opacity-60`}>
            Bỏ chọn hết
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="min-h-11 cursor-pointer rounded-[14px] border-0 bg-primary-strong px-[22px] text-[15px] font-extrabold text-white disabled:opacity-60"
          >
            Lưu điểm danh
          </button>
        </div>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-3 p-0">
        {students.map((s) => {
          const cur = st[s.id] ?? null
          const ring = OPT.find((o) => o[0] === cur)?.[2] ?? 'transparent'
          return (
            <li
              key={s.id}
              data-testid={`att-card-${s.code}`}
              className="flex flex-col gap-2.5 rounded-[22px] border-2 bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(102,117,232,.08)]"
              style={{ borderColor: ring }}
            >
              <div className="flex items-center gap-3">
                <AvatarImage avatar={s.avatar} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="text-[16.5px] font-extrabold">{s.fullName}</div>
                  <div className="text-[13px] text-muted">
                    {s.code} · <span data-testid={`att-status-${s.code}`}>{cur ? TEXT[cur] : 'Chưa điểm danh'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {OPT.map(([k, label, bg, color]) => {
                  const on = cur === k
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      disabled={pending}
                      onClick={() => set(s.id, on ? null : k)}
                      className="min-h-11 flex-[1_1_90px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 rounded-[12px] border-[1.5px] px-2.5 text-[13.5px] font-extrabold"
                      style={{ background: on ? bg : '#FFFFFF', color: on ? color : '#3A3769', borderColor: on ? bg : '#D9D5F2' }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      <section className="flex flex-wrap items-center justify-between gap-x-7 gap-y-4 rounded-[26px] bg-[linear-gradient(120deg,#33378F,#5C4FD8)] px-6 py-5 text-white">
        <h2 className="m-0 font-display text-[22px] font-extrabold">{isToday ? 'Tổng kết hôm nay' : `Tổng kết ngày ${dmy(date).slice(0, 5)}`}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {totals.map(([key, label, value, color]) => (
            <div key={key} className="flex min-w-[72px] flex-col items-center">
              <div data-testid={`total-${key}`} className="font-display text-[30px] font-extrabold leading-[1.1]" style={{ color }}>
                {value}
              </div>
              <div className="text-[13px] font-bold text-[#E4E7FF]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[26px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Lịch sử điểm danh theo ngày</h2>
          <span className="text-[13.5px] text-muted">Cô có thể chỉnh lại các ngày trước</span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[560px] flex-col gap-2">
            {history.length === 0 && <p className="m-0 text-sm text-muted">Chưa có ngày nào được điểm danh.</p>}
            {history.map((h) => (
              <div
                key={h.date}
                data-testid={`history-${h.date}`}
                className="grid grid-cols-[1.6fr_repeat(4,1fr)_1fr] items-center gap-2 rounded-[14px] bg-bg px-3.5 py-2.5 text-[14.5px] font-bold"
              >
                <div>{h.label}</div>
                <div className="text-[#12794F]">{h.present} có mặt</div>
                <div className="text-[#B02A4B]">{h.absent} vắng</div>
                <div className="text-[#2154B0]">{h.excused} có phép</div>
                <div className="text-[#7A5400]">{h.late} đi trễ</div>
                <Link
                  href={`/diem-danh?ngay=${h.date}`}
                  className="text-right text-primary-strong"
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
