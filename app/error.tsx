'use client'

import Link from 'next/link'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg p-6 text-center text-ink">
      <h1 className="m-0 font-display text-3xl font-extrabold">Có lỗi xảy ra</h1>
      <p className="m-0 text-muted">Em hãy thử lại, hoặc quay về trang chủ nhé.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-primary-strong bg-white px-5 font-extrabold text-primary-strong">
          Thử lại
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-primary-strong px-5 font-extrabold text-white">
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}
