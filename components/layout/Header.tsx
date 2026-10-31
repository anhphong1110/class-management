import Link from 'next/link'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { signOut } from '@/app/(auth)/actions'
import { formatVietnameseDate } from '@/lib/domain/date'
import { getShellData } from '@/lib/layout/shell-data'

export async function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const data = await getShellData()
  const today = formatVietnameseDate(new Date())
  return (
    <header className="box-border flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[24px] bg-white px-5 py-3 text-ink shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
      <div className="flex min-w-0 flex-col">
        <h1 className="m-0 font-display text-2xl font-extrabold leading-[1.15]">{title}</h1>
        <p className="m-0 text-[13.5px] text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {data && (
          <div className="rounded-full bg-[#EEF0FF] px-3.5 py-2 text-sm font-extrabold text-[#3441B5]">
            Lớp {data.cls.class_name} · {data.cls.school_year}
          </div>
        )}
        <div className="text-sm font-bold text-[#4A476E]">{today}</div>
        <Link
          href="/thong-bao"
          aria-label="Thông báo"
          className="flex size-11 items-center justify-center rounded-[14px] bg-bg text-[#3441B5]"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
          </svg>
        </Link>
        {data && <AvatarImage avatar={data.avatar} size={44} />}
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[14px] border-0 bg-bg px-4 text-sm font-extrabold text-[#3441B5]"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Đăng xuất
          </button>
        </form>
      </div>
    </header>
  )
}
