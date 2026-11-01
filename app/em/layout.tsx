import type { CSSProperties, ReactNode } from 'react'
import { StudentNav } from '@/components/layout/StudentNav'
import { StudentHeader } from '@/components/layout/StudentHeader'
import { getShellData } from '@/lib/layout/shell-data'
import { ThemeBodyVars } from '@/components/layout/ThemeBodyVars'
import { themeVars } from '@/lib/domain/theme'
import { formatVietnameseDate } from '@/lib/domain/date'
import { visibleStudentPages } from '@/lib/student/flags'
import { getStudentContext, getStudentProfile } from '@/lib/student/queries'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const ctx = await getStudentContext()
  const [data, profile] = await Promise.all([getShellData(), getStudentProfile()])
  const pages = visibleStudentPages(ctx.settings)
  const subtitle = `Lớp ${data?.cls.class_name ?? ''} · ${formatVietnameseDate(new Date())}`
  return (
    <div
      data-testid="student-shell"
      style={themeVars(data?.cls.theme) as CSSProperties}
      className="box-border flex min-h-screen flex-wrap content-start gap-5 bg-bg p-4 text-ink"
    >
      <ThemeBodyVars vars={themeVars(data?.cls.theme)} />
      <div className="min-w-0 max-w-none basis-full lg:max-w-[272px] lg:flex-[1_1_248px]">
        <StudentNav pages={[...pages]} classLogoUrl={data?.classLogoUrl ?? null} schoolLogoUrl={data?.schoolLogoUrl ?? null} className={data?.cls.class_name ?? ''} schoolName={data?.cls.school_name} />
      </div>
      <div className="flex min-w-0 basis-full flex-col gap-5 lg:flex-[999_1_560px]">
        <StudentHeader
          subtitle={subtitle}
          name={profile?.fullName ?? data?.user.displayName ?? ''}
          avatar={profile?.avatar ?? data?.avatar ?? null}
          showBell={pages.has('news')}
        />
        <main className="flex min-w-0 flex-col gap-5">{children}</main>
      </div>
    </div>
  )
}
