'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { STUDENT_NAV, STUDENT_TITLES } from '@/lib/student/flags'
import { PageHeaderShell } from './PageHeaderShell'

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
  return (
    <PageHeaderShell title={STUDENT_TITLES[id]} subtitle={subtitle} as={id === 'home' ? 'div' : 'h1'}>
      {showBell && (
        <Link
          href="/em/thong-bao"
          aria-label="Thông báo"
          className="flex size-12 items-center justify-center rounded-ctl bg-primary-soft text-primary-ink transition-colors hover:bg-primary-strong hover:text-white"
        >
          <Icon d={ICONS.bell} />
        </Link>
      )}
      <AvatarImage avatar={avatar} size={44} />
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold">{name}</div>
        <div className="text-[13px] font-semibold text-muted">Học sinh</div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="!min-h-11 !px-4 text-sm">
          <Icon d={ICONS.logout} size={18} />
          Đăng xuất
        </Button>
      </form>
    </PageHeaderShell>
  )
}
