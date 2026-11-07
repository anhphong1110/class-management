'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { PERIOD_LABELS, type Period } from '@/lib/domain/period'
import { kpiCards, unitLabel, viDate } from '@/lib/reports/format'
import { BAD_RANGE, isValidCustomRange, type ReportPeriod } from '@/lib/reports/range'
import type { ReportData } from '@/lib/reports/types'
import { exportReport } from './actions'

const H2 = 'm-0 font-display text-[22px] font-extrabold'
const SPIN = 'M21 12a9 9 0 1 1-6.2-8.6'
/** Sao trừ có sọc chéo, để phân biệt với sao cộng không chỉ bằng màu. */
const STRIPES = 'repeating-linear-gradient(135deg, rgba(255,255,255,.5) 0 3px, transparent 3px 7px)'
const ATTEND = [
  { key: 'present', label: 'Có mặt', cls: 'bg-success' },
  { key: 'late', label: 'Đi trễ', cls: 'bg-[#B45309]' },
  { key: 'excused', label: 'Vắng có phép', cls: 'bg-primary-strong' },
  { key: 'unexcused', label: 'Vắng không phép', cls: 'bg-danger' },
] as const

const TAB =
  'clay-press flex min-h-12 items-center gap-2 rounded-[16px] border-2 px-5 text-[15px] font-extrabold no-underline [--edge:var(--primary-edge)]'
const TAB_ON = 'border-primary-strong bg-primary-strong text-white'
const TAB_OFF = 'border-primary-strong bg-white text-primary-strong hover:bg-primary-soft'

function Empty({ children }: { children: string }) {
  return <p className="m-0 rounded-[12px] bg-field px-3 py-2.5 text-[15px] font-semibold text-muted">{children}</p>
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
    if (!isValidCustomRange(from, to)) {
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

  const summary = data
    ? `Từ ${viDate(data.from)} đến ${viDate(data.to)}: lớp được cộng ${data.kpis.added} sao, bị trừ ${data.kpis.deducted} sao, chuyên cần ${data.kpis.attendancePct}%, có ${data.kpis.redeemed} lượt đổi quà.`
    : ''

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 !px-[18px] !py-3.5">
        <div role="tablist" className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((k) => (
            <Link
              key={k}
              role="tab"
              aria-selected={period === k}
              href={`/bao-cao?ky=${k}`}
              replace
              scroll={false}
              className={`${TAB} ${period === k ? TAB_ON : TAB_OFF}`}
            >
              {PERIOD_LABELS[k]}
            </Link>
          ))}
          <Button variant={period === 'custom' ? 'primary' : 'secondary'} aria-pressed={period === 'custom'} onClick={() => setOpen(true)}>
            <Icon d={ICONS.calendar} size={18} />
            Chọn ngày
          </Button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" disabled={pending || !data} onClick={() => download('csv')}>
            {pending && <Icon d={SPIN} size={16} className="motion-safe:animate-spin" />}
            Xuất CSV
          </Button>
          <Button disabled={pending || !data} onClick={() => download('xlsx')}>
            {pending && <Icon d={SPIN} size={16} className="motion-safe:animate-spin" />}
            Xuất Excel
          </Button>
        </div>
      </Card>

      {(error || msg) && <Notice tone="error">{error || msg}</Notice>}

      {data && (
        <>
          <p className="m-0 text-base font-bold text-ink">{summary}</p>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            {kpiCards(data.kpis).map((k, i) => (
              <div key={k.label} data-testid="kpi" className="clay-card px-[18px] py-4">
                <Icon d={[ICONS.star, ICONS.minus, ICONS.checkCircle, ICONS.gift, ICONS.trophy][i] ?? ICONS.star} size={22} className="mb-1" />
                <div className="text-sm font-bold text-muted">{k.label}</div>
                <div className="font-display text-[32px] font-extrabold leading-[1.15]" style={{ color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 className={H2}>Sao cộng và sao trừ theo {unitLabel(data.bucket)}</h2>
              <div className="flex gap-3.5 text-sm font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="size-4 rounded bg-primary-strong" />
                  Sao cộng
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-4 rounded bg-danger" style={{ backgroundImage: STRIPES }} />
                  Sao trừ (sọc chéo)
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div
                data-testid="report-chart"
                aria-hidden="true"
                className="flex h-[230px] items-end gap-3 border-b-2 border-edge pt-2.5"
                style={{ minWidth: data.buckets.length * 78 }}
              >
                {data.buckets.map((b, i) => (
                  <div key={`${b.label}-${i}`} data-testid="report-bar" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex h-[190px] items-end gap-1">
                      <div className="flex h-full flex-col items-center justify-end">
                        <span className="text-xs font-extrabold text-primary-deep">{b.added}</span>
                        <div className="w-[22px] rounded-t-md bg-primary-strong" style={{ height: Math.max(4, Math.round((b.added / barMax) * 150)) }} />
                      </div>
                      <div className="flex h-full flex-col items-center justify-end">
                        <span className="text-xs font-extrabold text-danger-deep">{b.deducted}</span>
                        <div className="w-[22px] rounded-t-md bg-danger" style={{ height: Math.max(4, Math.round((b.deducted / barMax) * 150)), backgroundImage: STRIPES }} />
                      </div>
                    </div>
                    <div className="pt-1 text-[13px] font-bold text-muted">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <table className="sr-only">
              <caption>{`Số sao cộng và sao trừ theo ${unitLabel(data.bucket)}`}</caption>
              <thead>
                <tr>
                  <th scope="col">{`Mốc ${unitLabel(data.bucket)}`}</th>
                  <th scope="col">Sao cộng</th>
                  <th scope="col">Sao trừ</th>
                </tr>
              </thead>
              <tbody>
                {data.buckets.map((b, i) => (
                  <tr key={`${b.label}-${i}`}>
                    <th scope="row">{b.label}</th>
                    <td>{b.added}</td>
                    <td>{b.deducted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex flex-wrap items-stretch gap-4">
            <Card className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
              <h2 className={H2}>Tình hình chuyên cần</h2>
              <div role="img" aria-label="Tỉ lệ chuyên cần" className="flex h-[34px] overflow-hidden rounded-xl bg-primary-soft">
                {ATTEND.map((a) => (
                  <div key={a.key} className={a.cls} style={{ width: `${data.attendance[a.key]}%` }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ATTEND.map((a) => (
                  <div key={a.key} className="flex items-center gap-2 text-[15px] font-bold">
                    <span className={`size-4 rounded ${a.cls}`} />
                    {a.label}: {data.attendance[a.key]}%
                  </div>
                ))}
              </div>
              <div className="mt-1 text-[15px] font-extrabold text-ink">Cần quan tâm (vắng nhiều nhất)</div>
              {data.lowAttendance.length === 0 && <Empty>Chưa có bạn nào vắng trong kỳ này.</Empty>}
              {data.lowAttendance.map((l, i) => (
                <div key={`${i}-${l.name}`} className="flex justify-between rounded-xl bg-field px-3 py-2 text-[15px] font-bold">
                  <span>{l.name}</span>
                  <span className="text-danger-deep">{l.days} buổi vắng</span>
                </div>
              ))}
            </Card>

            <Card className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
              <h2 className={H2}>Tiêu chí thường gặp</h2>
              {data.criteria.length === 0 && <Empty>Chưa có lượt cộng hoặc trừ sao nào trong kỳ này.</Empty>}
              {data.criteria.map((c) => (
                <div key={`${c.kind}-${c.label}`} className="flex flex-col gap-[3px]">
                  <div className="flex justify-between gap-2 text-[15px] font-bold">
                    <span>{c.label}</span>
                    <span className={c.kind === 'award' ? 'text-primary-deep' : 'text-danger-deep'}>
                      {c.kind === 'award' ? 'Cộng' : 'Trừ'} · {c.n} lần
                    </span>
                  </div>
                  <div className="h-3 rounded-md bg-primary-soft">
                    <div
                      className={`h-full rounded-md ${c.kind === 'award' ? 'bg-primary-strong' : 'bg-danger'}`}
                      style={{ width: `${Math.round((c.n / critMax) * 100)}%`, backgroundImage: c.kind === 'award' ? undefined : STRIPES }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <div className="flex flex-wrap items-stretch gap-4">
            <Card className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5">
              <h2 className={H2}>Học sinh tiến bộ</h2>
              <div className="text-sm font-semibold text-muted">So với kỳ trước, tính theo sao thi đua nhận được.</div>
              {data.progress.length === 0 && <Empty>Chưa có bạn nào tiến bộ so với kỳ trước.</Empty>}
              {data.progress.map((p) => (
                <div key={p.studentId} className="flex items-center gap-3 rounded-2xl bg-field px-3 py-2">
                  <AvatarImage avatar={(p.avatarId && avatars[p.avatarId]) || null} size={40} />
                  <div className="flex-1 text-[15px] font-extrabold">{p.name}</div>
                  <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-extrabold text-success-deep">+{p.up} sao</span>
                </div>
              ))}
            </Card>

            <Card className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
              <h2 className={H2}>Phần thưởng đã đổi</h2>
              {data.gifts.length === 0 && <Empty>Chưa có lượt đổi quà nào trong kỳ này.</Empty>}
              {data.gifts.map((g, i) => (
                <div key={`${i}-${g.label}`} className="flex flex-col gap-[3px]">
                  <div className="flex justify-between text-[15px] font-bold">
                    <span>{g.label}</span>
                    <span className="text-[#5E35B1]">{g.n} lượt</span>
                  </div>
                  <div className="h-3 rounded-md bg-primary-soft">
                    <div className="h-full rounded-md bg-[#7A58E0]" style={{ width: `${Math.round((g.n / giftMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Chọn khoảng ngày">
        <div className="flex flex-col gap-3">
          <Field label="Từ ngày">{(a) => <Input {...a} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
          <Field label="Đến ngày">{(a) => <Input {...a} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
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
