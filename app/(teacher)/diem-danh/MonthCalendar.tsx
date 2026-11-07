'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { exportMonthCsv } from './actions'

export type CalendarDay = { date: string; attended: number }

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
  const attendedBy = new Map(days.map((d) => [d.date, d.attended]))
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

  const nav = '!px-4 !text-sm'

  return (
    <section className="clay-card flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="m-0 font-display text-[22px] font-extrabold">Lịch tháng</h2>
          <p data-testid="calendar-days-marked" className="m-0 text-[13.5px] font-semibold text-muted">
            Tháng {String(m).padStart(2, '0')}/{y}: đã điểm danh {days.length} ngày
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink variant="secondary" href={href(shiftMonth(month, -1))} className={nav}>
            Tháng trước
          </ButtonLink>
          <ButtonLink variant="secondary" href={href(shiftMonth(month, 1))} className={nav}>
            Tháng sau
          </ButtonLink>
          <Button onClick={exportCsv} disabled={pending}>
            Xuất CSV
          </Button>
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <p className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <Icon d={ICONS.checkCircle} size={16} className="text-success" />
        Ngày có dấu tích là đã điểm danh, số bên dưới là số bạn đi học trên sĩ số lớp.
      </p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[600px] grid-cols-7 gap-2">
          {WEEK.map((w) => (
            <div key={w} className="text-center text-xs font-extrabold text-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} />
            const attendedCount = attendedBy.get(d)
            const marked = attendedCount !== undefined
            const isSel = d === selected
            const body = (
              <>
                <span className="flex items-center gap-1 text-base font-extrabold">
                  {Number(d.slice(8))}
                  {marked ? <Icon d={ICONS.check} size={14} className="text-success" /> : null}
                </span>
                <span data-testid={`cal-count-${d}`} className="text-xs font-extrabold text-success-deep">
                  {marked ? `${attendedCount}/${classSize}` : ''}
                </span>
              </>
            )
            const base = `flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-ctl border-2 text-ink sm:min-h-20 ${
              isSel ? 'border-primary-strong shadow-[0_0_0_3px_var(--primary-soft)]' : d === today ? 'border-star-edge' : 'border-transparent'
            } ${marked ? 'bg-success-soft' : 'bg-bg'}`
            if (d > today) return <div key={d} aria-disabled="true" className={`${base} opacity-40`}>{body}</div>
            return (
              <Link
                key={d}
                data-testid={`cal-${d}`}
                href={`/diem-danh?ngay=${d}&thang=${month}`}
                aria-current={isSel ? 'date' : undefined}
                className={`${base} no-underline transition-colors hover:bg-primary-soft`}
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
