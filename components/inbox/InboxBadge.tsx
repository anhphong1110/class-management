'use client'

import Link from 'next/link'
import { Icon, ICONS } from '@/components/ui/Icon'
import { useInbox } from './InboxProvider'

export function formatCount(n: number): string {
  return n > 99 ? '99+' : String(n)
}

/** Nút phong thư ở thanh trên: bấm để mở hộp thư, số đỏ là tin chưa đọc. */
export function InboxBadge({ href, className = '' }: { href: string; className?: string }) {
  const { count } = useInbox()
  const label = count > 0 ? `Hộp thư, ${count} tin chưa đọc` : 'Hộp thư'
  return (
    <Link
      href={href}
      aria-label={label}
      title="Hộp thư"
      data-testid="inbox-badge"
      className={`relative flex size-11 items-center justify-center rounded-ctl bg-primary-soft text-primary-ink transition-colors hover:bg-primary-strong hover:text-white ${className}`}
    >
      <Icon d={ICONS.message} />
      {count > 0 && (
        <span
          data-testid="inbox-badge-count"
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[12px] font-extrabold leading-[18px] text-white"
        >
          {formatCount(count)}
        </span>
      )}
    </Link>
  )
}

/** Số nhỏ gắn vào mục menu "Hộp thư". Không có tin chưa đọc thì không hiện gì. */
export function InboxCountChip({ className = '' }: { className?: string }) {
  const { count } = useInbox()
  if (count <= 0) return null
  return (
    <span
      data-testid="inbox-nav-count"
      aria-label={`${count} tin chưa đọc`}
      className={`ml-auto inline-flex min-w-[22px] items-center justify-center rounded-full bg-danger px-1.5 text-[12px] font-extrabold leading-[20px] text-white ${className}`}
    >
      {formatCount(count)}
    </span>
  )
}
