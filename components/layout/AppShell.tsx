import type { CSSProperties, ReactNode } from 'react'
import { themeVars } from '@/lib/domain/theme'
import { RouteFocus, SkipLink } from './RouteFocus'
import { ThemeBodyVars } from './ThemeBodyVars'

/**
 * Khung ngoài chung của khu cô giáo và khu học sinh: màu chủ đề theo lớp, skip link,
 * chuyển focus khi đổi trang, cột menu bên trái và cột nội dung (`children`) bên phải.
 */
export function AppShell({
  testId,
  theme,
  nav,
  className = '',
  children,
}: {
  testId: string
  theme: string | null | undefined
  nav: ReactNode
  className?: string
  children: ReactNode
}) {
  const vars = themeVars(theme)
  return (
    <div
      data-testid={testId}
      style={vars as CSSProperties}
      className={`box-border flex min-h-screen flex-wrap content-start gap-5 bg-bg p-4 text-ink ${className}`}
    >
      <ThemeBodyVars vars={vars} />
      <SkipLink />
      <RouteFocus />
      <div className="min-w-0 max-w-none basis-full lg:max-w-[272px] lg:flex-[1_1_248px]">{nav}</div>
      {children}
    </div>
  )
}
