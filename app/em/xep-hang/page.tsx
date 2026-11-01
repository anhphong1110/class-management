import { AvatarImage } from '@/components/avatar/AvatarImage'
import { getRankData, requireStudentPage } from '@/lib/student/queries'

const BADGE = ['#FFC857', '#DDE2F0', '#F3BC97', '#E4E0F7', '#E4E0F7']

export default async function RankPage() {
  const ctx = await requireStudentPage('rank')
  const rows = await getRankData(ctx)
  return (
    <section className="flex flex-col gap-3 rounded-[28px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,0.10)]" aria-labelledby="rank-h">
      <h2 id="rank-h" className="m-0 font-display text-2xl font-extrabold">
        Top 5 ngôi sao sáng nhất · cả năm
      </h2>
      <div className="text-[13.5px] text-muted">Xếp theo sao thi đua tích lũy, không tính sao đã đổi quà.</div>
      {rows.map((r, i) => (
        <div
          key={r.studentId}
          data-testid="rank-row"
          className="flex items-center gap-3.5 rounded-[20px] border-2 px-4 py-2.5"
          style={{ background: r.me ? 'var(--primary-soft)' : '#F6F4FF', borderColor: r.me ? 'var(--primary-strong)' : 'transparent' }}
        >
          <div
            className="flex size-[42px] flex-none items-center justify-center rounded-full font-display text-xl font-extrabold text-[#3A2A00]"
            style={{ background: BADGE[Math.min(i, 4)] }}
          >
            {r.rank}
          </div>
          <AvatarImage avatar={r.avatar} size={52} />
          <div className="min-w-0 flex-1 text-[16.5px] font-extrabold">
            {r.name}
            {r.me && <span className="whitespace-pre text-[12.5px] font-extrabold text-primary-ink">{'  (em)'}</span>}
          </div>
          <div className="text-[19px] font-extrabold text-[#7A4E00]">{r.stars} sao</div>
        </div>
      ))}
    </section>
  )
}
