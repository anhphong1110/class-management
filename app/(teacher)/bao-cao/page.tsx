import { Header } from '@/components/layout/Header'
import { requireTeacher } from '@/lib/auth/session'
import { loadReport } from '@/lib/reports/queries'
import type { ReportPeriod } from '@/lib/reports/range'
import { ReportsClient } from './ReportsClient'

const PERIODS: ReportPeriod[] = ['week', 'month', 'term', 'year', 'custom']

export default async function Page({ searchParams }: { searchParams: Promise<{ ky?: string; tu?: string; den?: string }> }) {
  const user = await requireTeacher()
  const sp = await searchParams
  const period: ReportPeriod = PERIODS.find((p) => p === sp.ky) ?? 'month'
  const loaded = await loadReport(user.classId, period, { from: sp.tu, to: sp.den })

  return (
    <>
      <Header title="Thống kê – Báo cáo" subtitle="Dành riêng cho giáo viên" />
      <ReportsClient
        period={period}
        custom={{ from: sp.tu ?? '', to: sp.den ?? '' }}
        error={loaded.error ?? null}
        data={loaded.error === undefined ? loaded.data : null}
        avatars={loaded.error === undefined ? loaded.avatars : {}}
      />
    </>
  )
}
