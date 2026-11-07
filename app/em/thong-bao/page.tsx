import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { getAnnouncements } from '@/lib/announcements/queries'
import { announcementColors } from '@/lib/announcements/types'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { requireStudentPage } from '@/lib/student/queries'

// Chưa có dữ liệu "đã đọc / chưa đọc" của học sinh nên chưa có chấm chưa đọc; thông báo ghim được nhấn bằng viền vàng.
export default async function NewsPage() {
  const ctx = await requireStudentPage('news')
  const news = await getAnnouncements(ctx.classId, { includeArchived: false })
  const now = new Date()
  return (
    <div className="flex flex-col gap-4">
      {news.length === 0 && (
        <EmptyState title="Chưa có thông báo nào." icon={ICONS.bell}>
          Khi cô có tin mới, em sẽ thấy ở đây nhé.
        </EmptyState>
      )}
      {news.map((n) => {
        const [tint, ink] = announcementColors(n.type)
        return (
          <article
            key={n.id}
            data-testid="news-card"
            className={`clay-card flex flex-col gap-2 px-6 py-5 max-sm:px-4 ${n.pinned ? '[--primary-edge:#FFD65E]' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-[15px] font-extrabold" style={{ background: tint, color: ink }}>
                <Icon d={ICONS.bell} size={14} />
                {n.type}
              </span>
              {n.pinned && (
                <Badge tone="star">
                  <Icon d={ICONS.star} size={14} />
                  Đang ghim
                </Badge>
              )}
              <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-muted">
                <Icon d={ICONS.calendar} size={16} />
                {formatDayLabel(new Date(n.publishedAt), now)}
              </span>
            </div>
            <h2 className="m-0 font-display text-2xl font-extrabold leading-tight">{n.title}</h2>
            <div className="whitespace-pre-line text-base leading-normal text-ink">{n.body}</div>
            {n.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.imageUrl} alt="" className="mt-1 max-h-[320px] w-full rounded-panel object-cover" />
            )}
          </article>
        )
      })}
    </div>
  )
}
