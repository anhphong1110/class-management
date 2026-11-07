import Link from 'next/link'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { formatVietnameseDate } from '@/lib/domain/date'
import { getShellData } from '@/lib/layout/shell-data'
import { PageHeaderShell } from './PageHeaderShell'

const iconLink =
  'flex size-11 items-center justify-center rounded-ctl bg-primary-soft text-primary-ink transition-colors hover:bg-primary-strong hover:text-white'

export async function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const data = await getShellData()
  const today = formatVietnameseDate(new Date())
  return (
    <PageHeaderShell title={title} subtitle={subtitle}>
      {data && (
        <div className="rounded-full bg-primary-soft px-3.5 py-2 text-sm font-extrabold text-primary-deep">
          Lớp {data.cls.class_name} · {data.cls.school_year}
        </div>
      )}
      <div className="text-sm font-bold text-muted">{today}</div>
      <Link href="/em" aria-label="Xem như học sinh" title="Xem như học sinh" className={iconLink}>
        <Icon d={ICONS.eye} />
      </Link>
      <Link href="/thong-bao" aria-label="Thông báo" title="Thông báo" className={iconLink}>
        <Icon d={ICONS.bell} />
      </Link>
      {data && <AvatarImage avatar={data.avatar} size={44} />}
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="!min-h-11 !px-4 text-sm">
          <Icon d={ICONS.logout} size={18} />
          Đăng xuất
        </Button>
      </form>
    </PageHeaderShell>
  )
}
