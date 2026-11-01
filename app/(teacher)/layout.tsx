import type { CSSProperties, ReactNode } from 'react'
import { requireTeacher } from '@/lib/auth/session'
import { getShellData } from '@/lib/layout/shell-data'
import { ThemeBodyVars } from '@/components/layout/ThemeBodyVars'
import { themeVars } from '@/lib/domain/theme'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireTeacher()
  const data = await getShellData()
  return (
    <div
      data-testid="teacher-shell"
      style={themeVars(data?.cls.theme) as CSSProperties}
      className="box-border flex min-h-screen flex-wrap content-start gap-5 bg-bg p-4 text-ink"
    >
      <ThemeBodyVars vars={themeVars(data?.cls.theme)} />
      <div className="min-w-0 max-w-none basis-full lg:max-w-[272px] lg:flex-[1_1_248px]">
        <Sidebar
          teacher={{ displayName: data?.user.displayName ?? '', avatar: data?.avatar ?? null }}
          classLogoUrl={data?.classLogoUrl ?? null}
          schoolLogoUrl={data?.schoolLogoUrl ?? null}
          className={data?.cls.class_name ?? ''}
        />
      </div>
      <main className="flex min-w-0 basis-full lg:flex-[999_1_560px] flex-col gap-5">{children}</main>
    </div>
  )
}
