'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { exportMonthCsv } from './actions'

export type CalendarDay = { date: string; present: number }

const WEEK = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function MonthCalendar({
  month,
  selected,
  today,
  classSize,
  days,
}: {
  month: string
  selected: string
  today: string
  classSize: number
  days: CalendarDay[]
}) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [y, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const presentBy = new Map(days.map((d) => [d.date, d.present]))
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ]
  const href = (mo: string) => `/diem-danh?ngay=${selected}&thang=${mo}`

  function exportCsv() {
    setError('')
    startTransition(async () => {
      const res = await exportMonthCsv(month)
      if (res.error || !res.csv || !res.fileName) {
        setError(res.error ?? 'Có lỗi xảy ra, vui lòng thử lại.')
        return
      }
      const url = URL.createObjectURL(new Blob([res.csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <section className="flex flex-col gap-3 rounded-[26px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="m-0 font-display text-[22px] font-extrabold">Lịch tháng</h2>
          <p data-testid="calendar-days-marked" className="m-0 text-[13.5px] text-muted">
            Tháng {String(m).padStart(2, '0')}/{y}: đã điểm danh {days.length} ngày
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={href(shiftMonth(month, -1))}
            className="inline-flex min-h-11 items-center rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-4 text-sm font-extrabold text-[#3441B5]"
          >
            Tháng trước
          </Link>
          <Link
            href={href(shiftMonth(month, 1))}
            className="inline-flex min-h-11 items-center rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-4 text-sm font-extrabold text-[#3441B5]"
          >
            Tháng sau
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            disabled={pending}
            className="min-h-11 cursor-pointer rounded-[14px] border-0 bg-[#4F5BD5] px-5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            Xuất CSV
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="rounded-[14px] bg-[#FFE3EA] px-4 py-3 text-sm font-bold text-[#8E1B3B]">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
          {WEEK.map((w) => (
            <div key={w} className="text-center text-xs font-extrabold text-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} />
            const present = presentBy.get(d)
            const marked = present !== undefined
            const body = (
              <>
                <span className="text-sm font-extrabold">{Number(d.slice(8))}</span>
                <span className="text-xs font-bold text-[#12794F]">{marked ? `${present}/${classSize}` : ''}</span>
              </>
            )
            const base = `flex min-h-14 flex-col items-center justify-center rounded-[12px] ${
              d === selected ? 'border-2 border-[#4F5BD5]' : 'border-2 border-transparent'
            } ${marked ? 'bg-[#EAF8F1]' : 'bg-bg'}`
            if (d > today) return <div key={d} className={`${base} opacity-40`}>{body}</div>
            return (
              <Link
                key={d}
                data-testid={`cal-${d}`}
                href={`/diem-danh?ngay=${d}&thang=${month}`}
                className={base}
              >
                {body}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
