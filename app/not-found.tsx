import Link from 'next/link'
import { Icon, ICONS } from '@/components/ui/Icon'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-ink">
      <div className="clay-card flex max-w-[460px] flex-col items-center gap-3 px-8 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Icon d={ICONS.rocket} size={32} />
        </div>
        <h1 className="m-0 font-display text-3xl font-extrabold">Không tìm thấy trang này</h1>
        <p className="m-0 text-base font-semibold text-muted">Có vẻ phi thuyền đã bay lạc đường rồi.</p>
        <Link
          href="/"
          className="clay-press mt-2 inline-flex min-h-12 items-center gap-2 rounded-[16px] bg-primary-strong px-6 text-base font-extrabold text-white no-underline [--edge:var(--primary-deep)] hover:bg-primary-ink"
        >
          <Icon d={ICONS.home} size={20} />
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}
