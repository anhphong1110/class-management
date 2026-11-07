'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Icon, ICONS } from '@/components/ui/Icon'
import { BrandBlocks } from './NavParts'
import { NAV_TONES, TEACHER_NAV, TEACHER_NAV_META } from './nav'

type Props = {
  active?: string
  teacher: { displayName: string; avatar: AvatarValue }
  classLogoUrl: string | null
  schoolLogoUrl?: string | null
  className: string
  schoolName?: string | null
}

export function Sidebar({ active, teacher, classLogoUrl, schoolLogoUrl, className, schoolName }: Props) {
  const pathname = usePathname()
  const activeId =
    active ??
    TEACHER_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.id

  // Dưới lg menu là một hàng cuộn ngang: đưa mục đang chọn vào giữa để không bị khuất.
  useEffect(() => {
    document
      .querySelector('aside nav [aria-current="page"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  let lastGroup = ''
  return (
    <aside className="clay-card box-border flex w-full flex-col gap-[18px] px-3.5 py-5 text-ink lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <BrandBlocks
        classLogoUrl={classLogoUrl}
        schoolLogoUrl={schoolLogoUrl}
        className={className}
        schoolName={schoolName}
      />
      <nav
        aria-label="Menu chính"
        className="min-w-0 max-lg:[mask-image:linear-gradient(to_right,#000_90%,transparent)]"
      >
        <ul className="m-0 flex list-none flex-col gap-1 p-0 max-lg:flex-row max-lg:overflow-x-auto max-lg:pb-1 max-lg:pr-6">
          {TEACHER_NAV.map((it) => {
            const on = it.id === activeId
            const meta = TEACHER_NAV_META[it.id]
            const heading = meta && meta.group !== lastGroup ? meta.group : null
            if (meta) lastGroup = meta.group
            return (
              <li key={it.id} className="max-lg:flex-none first:[&>div]:pt-0">
                {heading && (
                  <div
                    aria-hidden="true"
                    className="px-3.5 pb-1 pt-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-muted max-lg:hidden"
                  >
                    {heading}
                  </div>
                )}
                <Link
                  href={it.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-2xl px-2.5 py-1.5 text-[15px] transition-colors ${
                    on
                      ? 'bg-primary-strong font-extrabold text-white shadow-[0_3px_0_var(--primary-deep)]'
                      : 'font-bold text-ink hover:bg-primary-soft hover:text-primary-deep'
                  }`}
                >
                  <span
                    className={`flex size-[30px] flex-none items-center justify-center rounded-[10px] ${
                      on ? 'bg-white/25 text-[#FFE08A]' : NAV_TONES[meta?.tone ?? 'blue']
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={it.icon} />
                    </svg>
                  </span>
                  {it.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div data-testid="sidebar-foot" className="flex flex-col gap-3 rounded-[20px] bg-primary-soft p-3.5 max-lg:hidden">
        <div className="flex items-center gap-2.5">
          <AvatarImage avatar={teacher.avatar} size={44} />
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold">{teacher.displayName}</div>
            <div className="text-[13px] font-semibold text-muted">Giáo viên – Admin</div>
          </div>
        </div>
        <Link
          href="/em"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border-2 border-primary-strong bg-white px-3 text-[14px] font-extrabold text-primary-strong transition-colors hover:bg-primary-soft hover:text-primary-deep"
        >
          <Icon d={ICONS.eye} size={18} />
          Xem như học sinh
        </Link>
      </div>
    </aside>
  )
}
