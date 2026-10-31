import { getAnnouncements } from '@/lib/announcements/queries'
import { announcementColors } from '@/lib/announcements/types'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { requireStudentPage } from '@/lib/student/queries'

export default async function NewsPage() {
  const ctx = await requireStudentPage('news')
  const news = await getAnnouncements(ctx.classId, { includeArchived: false })
  const now = new Date()
  return (
    <div className="flex flex-col gap-3.5">
      {news.length === 0 && <p className="m-0 rounded-3xl bg-white px-6 py-5 font-bold text-muted">Chưa có thông báo nào.</p>}
      {news.map((n) => {
        const [tint, ink] = announcementColors(n.type)
        return (
          <article key={n.id} data-testid="news-card" className="flex flex-col gap-1.5 rounded-3xl bg-white px-6 py-5 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-[3px] text-[12.5px] font-extrabold" style={{ background: tint, color: ink }}>
                {n.type}
              </span>
              {n.pinned && <span className="rounded-full bg-[#FFF1CC] px-3 py-[3px] text-[12.5px] font-extrabold text-[#6E4700]">Đang ghim</span>}
              <span className="text-[13px] text-muted">{formatDayLabel(new Date(n.publishedAt), now)}</span>
            </div>
            <h2 className="m-0 font-display text-xl font-extrabold">{n.title}</h2>
            <div className="whitespace-pre-line text-[15px] leading-normal text-[#4A476E]">{n.body}</div>
            {n.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.imageUrl} alt="" className="mt-1 max-h-[320px] w-full rounded-[18px] object-cover" />
            )}
          </article>
        )
      })}
    </div>
  )
}
