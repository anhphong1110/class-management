'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { TEACHER_NAV } from './nav'

type Props = {
  active?: string
  teacher: { displayName: string; avatar: AvatarValue }
  classLogoUrl: string | null
}

export function Sidebar({ active, teacher, classLogoUrl }: Props) {
  const pathname = usePathname()
  const activeId =
    active ??
    TEACHER_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.id
  return (
    <aside className="box-border flex w-full flex-col gap-[18px] rounded-[28px] bg-gradient-to-b from-navy-from to-navy-to px-3.5 py-5 text-white">
      <div className="flex items-center gap-2.5 px-1.5">
        <div className="relative size-11 flex-none overflow-hidden rounded-full bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-truong.jpg"
            alt="Logo trường Tiểu học Chính Nghĩa"
            className="absolute -left-px -top-px size-[46px] max-w-none object-cover"
          />
        </div>
        <div className="font-display text-[13.5px] font-extrabold leading-[1.15] tracking-[.04em]">
          TRƯỜNG TIỂU HỌC
          <br />
          CHÍNH NGHĨA
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={classLogoUrl ?? '/brand/logo-lop.jpg'}
          alt="Logo lớp"
          className="size-11 flex-none rounded-full bg-white object-cover"
        />
        <div className="font-display text-[17px] font-extrabold leading-[1.05] tracking-[.02em]">
          TRẠM KHÔNG GIAN
          <br />
          <span className="text-[#FFD36B]">NĂM 8</span>
        </div>
      </div>
      <nav aria-label="Menu chính" className="min-w-0">
        <ul className="m-0 flex list-none flex-col gap-1 p-0 max-lg:flex-row max-lg:overflow-x-auto">
          {TEACHER_NAV.map((it) => {
            const on = it.id === activeId
            return (
              <li key={it.id} className="max-lg:flex-none">
                <Link
                  href={it.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-2xl px-3.5 py-2 text-[15px] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white ${
                    on ? 'bg-white/[.18] font-extrabold text-white' : 'bg-transparent font-bold text-[#D5D9FF]'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke={on ? '#FFD36B' : '#D5D9FF'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="flex-none"
                  >
                    <path d={it.icon} />
                  </svg>
                  {it.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div
        data-testid="sidebar-foot"
        className="flex items-center gap-2.5 rounded-[20px] bg-white/10 p-3.5 max-lg:hidden"
      >
        <AvatarImage avatar={teacher.avatar} size={44} />
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold">{teacher.displayName}</div>
          <div className="text-[12.5px] text-[#D5D9FF]">Giáo viên – Admin</div>
        </div>
      </div>
    </aside>
  )
}
