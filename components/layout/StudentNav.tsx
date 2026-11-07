'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, ICONS } from '@/components/ui/Icon'
import { STUDENT_NAV, type StudentPageId } from '@/lib/student/flags'
import { BrandBlocks } from './NavParts'
import { NAV_TONES, STUDENT_NAV_TONES } from './nav'

const MAX_TABS = 5

type Props = {
  pages: StudentPageId[]
  classLogoUrl: string | null
  schoolLogoUrl?: string | null
  className: string
  schoolName?: string | null
}

/**
 * Từ lg trở lên: thanh bên. Dưới lg: thanh tab dưới đáy (icon to + chữ).
 * Nhiều hơn 5 trang thì 4 mục đầu + "Thêm" mở bảng chứa các mục còn lại.
 */
export function StudentNav({ pages, classLogoUrl, schoolLogoUrl, className, schoolName }: Props) {
  const pathname = usePathname()
  const [more, setMore] = useState(false)
  const items = STUDENT_NAV.filter((n) => pages.includes(n.id))
  const activeId = items.find((n) => (n.href === '/em' ? pathname === '/em' : pathname === n.href || pathname.startsWith(n.href + '/')))?.id
  const overflow = items.length > MAX_TABS
  const tabs = overflow ? items.slice(0, MAX_TABS - 1) : items
  const rest = overflow ? items.slice(MAX_TABS - 1) : []
  const restActive = rest.some((n) => n.id === activeId)

  return (
    <aside className="box-border flex w-full flex-col gap-[18px] text-ink lg:clay-card lg:px-3.5 lg:py-5 lg:sticky lg:top-4">
      <div className="flex flex-col gap-[18px] max-lg:hidden">
        <BrandBlocks classLogoUrl={classLogoUrl} schoolLogoUrl={schoolLogoUrl} className={className} schoolName={schoolName} />
      </div>
      <nav
        aria-label="Menu học sinh"
        className="min-w-0 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t-2 max-lg:border-edge max-lg:bg-white max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-[0_-6px_20px_rgba(35,31,77,0.08)]"
      >
        <ul className="m-0 flex list-none flex-col gap-1 p-0 max-lg:flex-row max-lg:gap-0 max-lg:px-1">
          {items.map((it) => {
            const on = it.id === activeId
            const hiddenOnMobile = overflow && !tabs.includes(it)
            const tone = NAV_TONES[STUDENT_NAV_TONES[it.id] ?? 'blue']
            return (
              <li key={it.id} className={`max-lg:min-w-0 max-lg:flex-1 ${hiddenOnMobile ? 'max-lg:hidden' : ''}`}>
                <Link
                  href={it.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-2.5 py-1.5 text-[15px] transition-colors lg:min-h-[48px] max-lg:min-h-[64px] max-lg:flex-col max-lg:justify-center max-lg:gap-0.5 max-lg:px-1 max-lg:text-[12.5px] max-lg:leading-tight max-lg:text-center ${
                    on
                      ? 'bg-primary-strong font-extrabold text-white lg:shadow-ledge-active max-lg:bg-primary-soft max-lg:text-primary-deep'
                      : 'font-bold text-ink hover:bg-primary-soft hover:text-primary-deep'
                  }`}
                  onClick={() => setMore(false)}
                >
                  <span
                    className={`flex size-[30px] flex-none items-center justify-center rounded-chip max-lg:size-9 max-lg:rounded-chip ${
                      on ? 'bg-white/25 text-[#FFE08A] max-lg:bg-primary-strong max-lg:text-white' : tone
                    }`}
                  >
                    <Icon d={it.icon} size={20} />
                  </span>
                  {it.label}
                </Link>
              </li>
            )
          })}
          {overflow && (
            <li className="min-w-0 flex-1 lg:hidden">
              <button
                type="button"
                aria-expanded={more}
                aria-controls="student-more"
                onClick={() => setMore((v) => !v)}
                className={`flex min-h-[64px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[12.5px] font-bold leading-tight transition-colors ${
                  restActive || more ? 'bg-primary-soft text-primary-deep' : 'text-ink hover:bg-primary-soft'
                }`}
              >
                <span className={`flex size-9 items-center justify-center rounded-chip ${restActive || more ? 'bg-primary-strong text-white' : 'bg-primary-soft text-primary-ink'}`}>
                  <Icon d={ICONS.more} size={20} />
                </span>
                Thêm
              </button>
            </li>
          )}
        </ul>
        {overflow && more && (
          <div id="student-more" className="clay-card fixed inset-x-3 bottom-[84px] z-30 p-2 lg:hidden">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {rest.map((it) => (
                <li key={`more-${it.id}`}>
                  <Link
                    href={it.href}
                    aria-current={it.id === activeId ? 'page' : undefined}
                    onClick={() => setMore(false)}
                    className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-[16px] font-extrabold ${
                      it.id === activeId ? 'bg-primary-strong text-white' : 'text-ink hover:bg-primary-soft'
                    }`}
                  >
                    <span className={`flex size-9 items-center justify-center rounded-chip ${NAV_TONES[STUDENT_NAV_TONES[it.id] ?? 'blue']}`}>
                      <Icon d={it.icon} size={20} />
                    </span>
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
      <div className="rounded-ctl bg-primary-soft px-3 py-2.5 text-[13px] font-semibold leading-[1.4] text-primary-deep max-lg:hidden">
        Giao diện học sinh: chỉ xem và gửi yêu cầu đổi quà.
      </div>
    </aside>
  )
}
