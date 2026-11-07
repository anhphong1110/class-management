import type { ReactNode } from 'react'
import { StudentNav } from '@/components/layout/StudentNav'
import { StudentHeader } from '@/components/layout/StudentHeader'
import { getShellData } from '@/lib/layout/shell-data'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import { formatVietnameseDate } from '@/lib/domain/date'
import { visibleStudentPages } from '@/lib/student/flags'
import { getStudentContext, getStudentProfile } from '@/lib/student/queries'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const ctx = await getStudentContext()
  const [data, profile] = await Promise.all([getShellData(), getStudentProfile()])
  const pages = visibleStudentPages(ctx.settings)
  const subtitle = `Lớp ${data?.cls.class_name ?? ''} · ${formatVietnameseDate(new Date())}`
  return (
    <AppShell
      testId="student-shell"
      theme={data?.cls.theme}
      className="max-lg:pb-28"
      nav={
        <StudentNav pages={[...pages]} classLogoUrl={data?.classLogoUrl ?? null} schoolLogoUrl={data?.schoolLogoUrl ?? null} className={data?.cls.class_name ?? ''} brandName={data?.cls.brand_title} schoolName={data?.cls.school_name} />
      }
    >
      <div className="flex min-w-0 basis-full flex-col gap-5 lg:flex-[999_1_560px]">
        <StudentHeader
          subtitle={subtitle}
          name={profile?.fullName ?? data?.user.displayName ?? ''}
          avatar={profile?.avatar ?? data?.avatar ?? null}
          showBell={pages.has('news')}
          canChangePassword={!ctx.preview}
        />
        {ctx.preview && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-star-soft px-4 py-2.5 text-[15px] font-extrabold text-star-ink">
            <span>Đang xem thử giao diện học sinh</span>
            <Link
              href="/tong-quan"
              className="inline-flex min-h-11 items-center rounded-ctl border-2 border-star-ink bg-white px-4 text-star-ink transition-colors hover:bg-star-soft"
            >
              Quay lại trang cô giáo
            </Link>
          </div>
        )}
        <main id="main" tabIndex={-1} className="flex min-w-0 flex-col gap-5 outline-none">{children}</main>
      </div>
    </AppShell>
  )
}
