'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { isValidIsoDate } from '@/lib/domain/date'
import { PERIOD_LABELS, type Period } from '@/lib/domain/period'
import { kpiCards, unitLabel } from '@/lib/reports/format'
import { BAD_RANGE, type ReportPeriod } from '@/lib/reports/range'
import type { ReportData } from '@/lib/reports/types'
import { exportReport } from './actions'

const CARD = 'rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,.10)]'
const H2 = 'm-0 font-display text-[22px] font-extrabold'
const PLUS = 'var(--primary-strong)'
const MINUS = '#C0314E'
const ATTEND = [
  { key: 'present', label: 'Có mặt', bg: '#12794F' },
  { key: 'late', label: 'Đi trễ', bg: '#FFC857' },
  { key: 'excused', label: 'Vắng có phép', bg: '#2563C9' },
  { key: 'unexcused', label: 'Vắng không phép', bg: '#C0314E' },
] as const
const DATE_INPUT = 'min-h-12 w-full rounded-[14px] border-2 border-[#D9D5F2] bg-white px-3.5 text-[15px] font-semibold text-ink'

const tabBtn = (on: boolean) => ({
  background: on ? 'var(--primary-strong)' : '#fff',
  color: on ? '#fff' : '#3A3769',
  borderColor: on ? 'var(--primary-strong)' : '#D9D5F2',
})

function Empty({ children }: { children: string }) {
  return <p className="m-0 rounded-[12px] bg-[#F6F4FF] px-3 py-2.5 text-[14.5px] font-semibold text-muted">{children}</p>
}

export function ReportsClient({
  period,
  custom,
  error,
  data,
  avatars,
}: {
  period: ReportPeriod
  custom: { from: string; to: string }
  error: string | null
  data: ReportData | null
  avatars: Record<string, AvatarValue>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(custom.from)
  const [to, setTo] = useState(custom.to)
  const [dialogError, setDialogError] = useState('')

  function submitDates() {
    if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to) {
      setDialogError(BAD_RANGE)
      return
    }
    setDialogError('')
    setOpen(false)
    router.push(`/bao-cao?ky=custom&tu=${from}&den=${to}`)
  }

  function download(format: 'csv' | 'xlsx') {
    startTransition(async () => {
      setMsg('')
      const res = await exportReport({ period, from: custom.from || undefined, to: custom.to || undefined, format })
      if (res.error || !res.base64 || !res.fileName || !res.mime) {
        setMsg(res.error ?? 'Có lỗi xảy ra, vui lòng thử lại.')
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: res.mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
  }

  const barMax = data ? Math.max(1, ...data.buckets.flatMap((b) => [b.added, b.deducted])) : 1
  const critMax = data ? Math.max(1, ...data.criteria.map((c) => c.n)) : 1
  const giftMax = data ? Math.max(1, ...data.gifts.map((g) => g.n)) : 1

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] bg-white px-[18px] py-3.5 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div role="tablist" className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((k) => (
            <Link
              key={k}
              role="tab"
              aria-selected={period === k}
              href={`/bao-cao?ky=${k}`}
              replace
              scroll={false}
              className="flex min-h-12 cursor-pointer items-center rounded-[14px] border-2 px-5 text-[15px] font-extrabold"
              style={tabBtn(period === k)}
            >
              {PERIOD_LABELS[k]}
            </Link>
          ))}
          <button
            type="button"
            aria-pressed={period === 'custom'}
            onClick={() => setOpen(true)}
            className="min-h-12 cursor-pointer rounded-[14px] border-2 px-[18px] text-[15px] font-extrabold"
            style={period === 'custom' ? tabBtn(true) : { background: '#fff', color: '#3441B5', borderColor: '#D9D5F2' }}
          >
            Chọn ngày
          </button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={pending || !data}
            onClick={() => download('csv')}
            className="min-h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-[18px] text-[14.5px] font-extrabold text-[#3441B5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xuất CSV
          </button>
          <button
            type="button"
            disabled={pending || !data}
            onClick={() => download('xlsx')}
            className="min-h-12 cursor-pointer rounded-[14px] border-0 bg-primary-strong px-[18px] text-[14.5px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xuất Excel
          </button>
        </div>
      </div>

      {(error || msg) && <Notice tone="error">{error || msg}</Notice>}

      {data && (
        <>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            {kpiCards(data.kpis).map((k) => (
              <div key={k.label} data-testid="kpi" className="rounded-[22px] bg-white px-[18px] py-4 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
                <div className="text-[13.5px] font-bold text-muted">{k.label}</div>
                <div className="font-display text-[32px] font-extrabold leading-[1.15]" style={{ color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div className={`${CARD} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 className={H2}>Sao cộng và sao trừ theo {unitLabel(data.bucket)}</h2>
              <div className="flex gap-3.5 text-[13.5px] font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 rounded bg-primary-strong" />
                  Sao cộng
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 rounded" style={{ background: MINUS }} />
                  Sao trừ
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div
                data-testid="report-chart"
                className="flex h-[230px] items-end gap-3 border-b-2 border-[#E4E0F7] pt-2.5"
                style={{ minWidth: data.buckets.length * 78 }}
              >
                {data.buckets.map((b, i) => (
                  <div key={`${b.label}-${i}`} data-testid="report-bar" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex h-[190px] items-end gap-1">
                      <div className="flex h-full flex-col items-center justify-end">
                        <span className="text-xs font-extrabold text-[#2C37A8]">{b.added}</span>
                        <div className="w-[22px] rounded-t-md" style={{ height: Math.max(4, Math.round((b.added / barMax) * 150)), background: PLUS }} />
                      </div>
                      <div className="flex h-full flex-col items-center justify-end">
                        <span className="text-xs font-extrabold text-[#8E1B3B]">{b.deducted}</span>
                        <div className="w-[22px] rounded-t-md" style={{ height: Math.max(4, Math.round((b.deducted / barMax) * 150)), background: MINUS }} />
                      </div>
                    </div>
                    <div className="pt-1 text-[13px] font-bold text-[#4A476E]">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-4">
            <div className={`${CARD} flex min-w-0 flex-[1_1_360px] flex-col gap-3`}>
              <h2 className={H2}>Tình hình chuyên cần</h2>
              <div role="img" aria-label="Tỉ lệ chuyên cần" className="flex h-[34px] overflow-hidden rounded-xl bg-[#EEEBFA]">
                {ATTEND.map((a) => (
                  <div key={a.key} style={{ width: `${data.attendance[a.key]}%`, background: a.bg }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ATTEND.map((a) => (
                  <div key={a.key} className="flex items-center gap-2 text-[14.5px] font-bold">
                    <span className="size-3.5 rounded" style={{ background: a.bg }} />
                    {a.label}: {data.attendance[a.key]}%
                  </div>
                ))}
              </div>
              <div className="mt-1 text-[14.5px] font-extrabold text-[#4A476E]">Cần quan tâm (vắng nhiều nhất)</div>
              {data.lowAttendance.length === 0 && <Empty>Chưa có bạn nào vắng trong kỳ này.</Empty>}
              {data.lowAttendance.map((l) => (
                <div key={l.name} className="flex justify-between rounded-xl bg-[#F6F4FF] px-3 py-2 text-[14.5px] font-bold">
                  <span>{l.name}</span>
                  <span className="text-[#8E1B3B]">{l.days} buổi vắng</span>
                </div>
              ))}
            </div>

            <div className={`${CARD} flex min-w-0 flex-[1_1_360px] flex-col gap-3`}>
              <h2 className={H2}>Tiêu chí thường gặp</h2>
              {data.criteria.length === 0 && <Empty>Chưa có lượt cộng hoặc trừ sao nào trong kỳ này.</Empty>}
              {data.criteria.map((c) => (
                <div key={`${c.kind}-${c.label}`} className="flex flex-col gap-[3px]">
                  <div className="flex justify-between text-[14.5px] font-bold">
                    <span>{c.label}</span>
                    <span style={{ color: c.kind === 'award' ? '#2C37A8' : '#8E1B3B' }}>{c.n} lần</span>
                  </div>
                  <div className="h-2.5 rounded-md bg-[#EEEBFA]">
                    <div className="h-full rounded-md" style={{ width: `${Math.round((c.n / critMax) * 100)}%`, background: c.kind === 'award' ? PLUS : MINUS }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-4">
            <div className={`${CARD} flex min-w-0 flex-[1_1_360px] flex-col gap-2.5`}>
              <h2 className={H2}>Học sinh tiến bộ</h2>
              <div className="text-[13.5px] text-muted">So với kỳ trước, tính theo sao thi đua nhận được.</div>
              {data.progress.length === 0 && <Empty>Chưa có bạn nào tiến bộ so với kỳ trước.</Empty>}
              {data.progress.map((p) => (
                <div key={p.studentId} className="flex items-center gap-3 rounded-2xl bg-[#F6F4FF] px-3 py-2">
                  <AvatarImage avatar={(p.avatarId && avatars[p.avatarId]) || null} size={40} />
                  <div className="flex-1 text-[15px] font-extrabold">{p.name}</div>
                  <span className="rounded-full bg-[#DDF6F1] px-3 py-1 text-sm font-extrabold text-[#0B5A4D]">+{p.up} sao</span>
                </div>
              ))}
            </div>

            <div className={`${CARD} flex min-w-0 flex-[1_1_360px] flex-col gap-3`}>
              <h2 className={H2}>Phần thưởng đã đổi</h2>
              {data.gifts.length === 0 && <Empty>Chưa có lượt đổi quà nào trong kỳ này.</Empty>}
              {data.gifts.map((g) => (
                <div key={g.label} className="flex flex-col gap-[3px]">
                  <div className="flex justify-between text-[14.5px] font-bold">
                    <span>{g.label}</span>
                    <span className="text-[#5E35B1]">{g.n} lượt</span>
                  </div>
                  <div className="h-2.5 rounded-md bg-[#EEEBFA]">
                    <div className="h-full rounded-md bg-[#7A58E0]" style={{ width: `${Math.round((g.n / giftMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Chọn khoảng ngày">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
            Từ ngày
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={DATE_INPUT} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
            Đến ngày
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={DATE_INPUT} />
          </label>
          {dialogError && <Notice tone="error">{dialogError}</Notice>}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={submitDates}>Xem báo cáo</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
