import Link from 'next/link'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { formatVietnameseDate } from '@/lib/domain/date'
import { getShellData } from '@/lib/layout/shell-data'

const iconLink =
  'flex size-11 items-center justify-center rounded-ctl bg-primary-soft text-primary-ink transition-colors hover:bg-primary-strong hover:text-white'

export async function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const data = await getShellData()
  const today = formatVietnameseDate(new Date())
  return (
    <header className="clay-card box-border flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-3 text-ink">
      <div className="flex min-w-0 flex-col">
        <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.1]">{title}</h1>
        <p className="m-0 text-[14px] font-semibold text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
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
      </div>
    </header>
  )
}
