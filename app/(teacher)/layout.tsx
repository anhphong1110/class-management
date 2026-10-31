import type { CSSProperties, ReactNode } from 'react'
import { requireTeacher } from '@/lib/auth/session'
import { getShellData } from '@/lib/layout/shell-data'
import { THEMES } from '@/lib/domain/theme'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireTeacher()
  const data = await getShellData()
  const theme = data?.cls.theme && THEMES[data.cls.theme] ? data.cls.theme : 'indigo'
  return (
    <div
      data-testid="teacher-shell"
      style={{ '--primary': THEMES[theme].primary } as CSSProperties}
      className="box-border flex min-h-screen flex-wrap gap-5 bg-bg p-4 text-ink"
    >
      <div className="max-w-[272px] flex-[1_1_248px]">
        <Sidebar
          teacher={{ displayName: data?.user.displayName ?? '', avatar: data?.avatar ?? null }}
          classLogoUrl={data?.classLogoUrl ?? null}
        />
      </div>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">{children}</main>
    </div>
  )
}
