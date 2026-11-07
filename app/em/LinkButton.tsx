import Link from 'next/link'
import type { ReactNode } from 'react'

/** Liên kết trông như nút chính cỡ lớn (cùng kiểu Button primary size lg) cho học sinh. */
export function LinkButton({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`clay-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-ctl bg-primary-strong px-6 text-lg font-extrabold text-white no-underline [--edge:var(--primary-deep)] hover:bg-primary-ink ${className}`}
    >
      {children}
    </Link>
  )
}
