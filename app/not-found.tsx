import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg p-6 text-center text-ink">
      <h1 className="m-0 font-display text-3xl font-extrabold">Không tìm thấy trang này</h1>
      <p className="m-0 text-muted">Có vẻ phi thuyền đã bay lạc đường rồi.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-primary-strong px-5 font-extrabold text-white">
        Về trang chủ
      </Link>
    </main>
  )
}
