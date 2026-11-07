import type { ReactNode } from 'react'
import { requireTeacher } from '@/lib/auth/session'
import { getShellData } from '@/lib/layout/shell-data'
import { AppShell } from '@/components/layout/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { FlashNotice } from '@/components/layout/FlashNotice'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireTeacher()
  const data = await getShellData()
  return (
    <AppShell
      testId="teacher-shell"
      theme={data?.cls.theme}
      nav={
        <Sidebar
          teacher={{ displayName: data?.user.displayName ?? '', avatar: data?.avatar ?? null }}
          classLogoUrl={data?.classLogoUrl ?? null}
          schoolLogoUrl={data?.schoolLogoUrl ?? null}
          className={data?.cls.class_name ?? ''}
          brandName={data?.cls.brand_title}
          schoolName={data?.cls.school_name}
        />
      }
    >
      <main id="main" tabIndex={-1} className="flex min-w-0 basis-full flex-col gap-5 outline-none lg:flex-[999_1_560px]">
        <FlashNotice />
        {children}
      </main>
    </AppShell>
  )
}
