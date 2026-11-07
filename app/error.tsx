'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-ink">
      <div className="clay-card flex max-w-[460px] flex-col items-center gap-3 px-8 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger-deep">
          <Icon d={ICONS.alert} size={32} />
        </div>
        <h1 className="m-0 font-display text-3xl font-extrabold">Có lỗi xảy ra</h1>
        <p className="m-0 text-base font-semibold text-muted">Cô hoặc em thử lại, hoặc quay về trang chủ nhé.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" size="lg" onClick={reset}>
            Thử lại
          </Button>
          <Link
            href="/"
            className="clay-press inline-flex min-h-[52px] items-center gap-2 rounded-[16px] bg-primary-strong px-6 text-lg font-extrabold text-white no-underline [--edge:var(--primary-deep)] hover:bg-primary-ink"
          >
            <Icon d={ICONS.home} size={20} />
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  )
}
