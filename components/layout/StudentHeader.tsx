'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { signOut } from '@/app/(auth)/actions'
import { STUDENT_NAV, STUDENT_TITLES } from '@/lib/student/flags'

type Props = {
  subtitle: string
  name: string
  avatar: AvatarValue
  showBell: boolean
}

export function StudentHeader({ subtitle, name, avatar, showBell }: Props) {
  const pathname = usePathname()
  const page = STUDENT_NAV.find((n) => (n.href === '/em' ? pathname === '/em' : pathname === n.href || pathname.startsWith(n.href + '/')))
  const id = page?.id ?? 'home'
  const Title = id === 'home' ? 'div' : 'h1'
  return (
    <header className="box-border flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[24px] bg-white px-5 py-3 text-ink shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
      <div className="flex min-w-0 flex-col">
        <Title className="m-0 font-display text-2xl font-extrabold leading-[1.15]">{STUDENT_TITLES[id]}</Title>
        <p className="m-0 text-[13.5px] text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showBell && (
          <Link
            href="/em/thong-bao"
            aria-label="Thông báo"
            className="flex size-11 items-center justify-center rounded-[14px] bg-bg text-primary-ink"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            </svg>
          </Link>
        )}
        <AvatarImage avatar={avatar} size={44} />
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold">{name}</div>
          <div className="text-[12.5px] text-muted">Học sinh</div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] border-0 bg-bg px-4 text-sm font-extrabold text-primary-ink"
          >
            Đăng xuất
          </button>
        </form>
      </div>
    </header>
  )
}
