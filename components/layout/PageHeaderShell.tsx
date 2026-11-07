import type { ReactNode } from 'react'

/** Thẻ tiêu đề trang dùng chung cho cô giáo và học sinh: tên trang + dòng phụ bên trái, `children` (hành động, hồ sơ) bên phải. */
export function PageHeaderShell({
  title,
  subtitle,
  as: Title = 'h1',
  children,
}: {
  title: string
  subtitle: string
  as?: 'h1' | 'div'
  children: ReactNode
}) {
  return (
    <header className="clay-card box-border flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-3 text-ink">
      <div className="flex min-w-0 flex-col">
        <Title className="m-0 font-display text-[28px] font-extrabold leading-[1.1]">{title}</Title>
        <p className="m-0 text-[14px] font-semibold text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </header>
  )
}
