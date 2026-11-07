import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { getRankData, requireStudentPage } from '@/lib/student/queries'

/** Huy chương top 3 (vàng, bạc, đồng); số hạng luôn hiện bằng chữ nên không dựa vào màu. */
function medalClass(rank: number): string {
  if (rank === 1) return 'bg-star text-ink'
  if (rank === 2) return 'bg-[#DDE2F0] text-ink'
  if (rank === 3) return 'bg-[#F3BC97] text-ink'
  return 'bg-primary-soft text-primary-deep'
}

export default async function RankPage() {
  const ctx = await requireStudentPage('rank')
  const rows = await getRankData(ctx)
  return (
    <section className="clay-card flex flex-col gap-3 p-6 max-sm:px-4" aria-labelledby="rank-h">
      <h2 id="rank-h" className="m-0 font-display text-2xl font-extrabold">
        Top 5 ngôi sao sáng nhất · cả năm
      </h2>
      <div className="text-base font-semibold text-muted">Xếp theo sao thi đua tích lũy, không tính sao đã đổi quà.</div>
      {rows.length === 0 && (
        <EmptyState title="Chưa có bảng xếp hạng." icon={ICONS.trophy}>
          Khi cả lớp có sao, em sẽ thấy các bạn ở đây.
        </EmptyState>
      )}
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((r) => (
          <li
            key={r.studentId}
            data-testid="rank-row"
            aria-current={r.me ? 'true' : undefined}
            className={`flex min-h-[68px] items-center gap-3.5 rounded-panel border-2 px-4 py-2.5 max-sm:gap-2.5 max-sm:px-3 ${
              r.me ? 'border-primary-strong bg-primary-soft' : 'border-transparent bg-bg'
            }`}
          >
            <div className={`flex size-11 flex-none items-center justify-center rounded-full font-display text-xl font-extrabold ${medalClass(r.rank)}`}>
              {r.rank}
            </div>
            <AvatarImage avatar={r.avatar} size={52} />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[17px] font-extrabold">
              <span className="min-w-0">{r.name}</span>
              {r.me && <Badge tone="star">(em)</Badge>}
            </div>
            <div className="inline-flex flex-none items-center gap-1.5 text-xl font-extrabold text-star-ink">
              <Icon d={ICONS.star} size={20} className="text-star-edge" />
              <span>{r.stars} sao</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
