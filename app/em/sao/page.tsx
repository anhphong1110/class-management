import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { getStarsData, getStudentProfile, requireStudentPage } from '@/lib/student/queries'
import { StudentStats } from '../StudentStats'

export default async function StarsPage() {
  const ctx = await requireStudentPage('stars')
  const profile = await getStudentProfile()
  const { history, badges } = await getStarsData(ctx)
  return (
    <div className="flex flex-col gap-5">
      {profile && <StudentStats profile={profile} />}

      <section className="clay-card flex flex-col gap-3 px-6 py-[22px] max-sm:px-4" aria-labelledby="hist-h">
        <h2 id="hist-h" className="m-0 font-display text-[22px] font-extrabold">
          Lịch sử sao của em
        </h2>
        <div className="text-base font-semibold text-muted">Em chỉ thấy lịch sử của riêng mình, không thấy của bạn khác.</div>
        {history.length === 0 && (
          <EmptyState title="Em chưa có sao nào trong lịch sử." icon={ICONS.star}>
            Cố gắng lên, ngôi sao đầu tiên sắp đến rồi!
          </EmptyState>
        )}
        {history.map((h) => {
          const minus = h.delta < 0
          return (
            <div key={h.id} data-testid="history-row" className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-bg px-3.5 py-2.5">
              <span
                className={`inline-flex min-w-[72px] flex-none items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-lg font-extrabold ${
                  minus ? 'bg-danger-soft text-danger-deep' : 'bg-star-soft text-star-ink'
                }`}
              >
                <Icon d={minus ? ICONS.minus : ICONS.star} size={18} />
                {h.delta > 0 ? `+${h.delta}` : h.delta}
              </span>
              <span className="min-w-0 flex-[1_1_160px] text-base font-bold">{h.label}</span>
              <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-muted">
                <Icon d={ICONS.calendar} size={16} />
                {h.dateLabel}
              </span>
            </div>
          )
        })}
      </section>

      {badges.length > 0 && (
        <section className="clay-card flex flex-col gap-3 px-6 py-[22px] max-sm:px-4" aria-labelledby="badge-h">
          <h2 id="badge-h" className="m-0 font-display text-[22px] font-extrabold">
            Huy hiệu của em
          </h2>
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <span
                key={b.id}
                data-testid="badge"
                data-earned={b.earned}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-extrabold ${
                  b.earned ? 'border-star bg-star-soft text-star-ink' : 'border-edge bg-bg text-muted'
                }`}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" strokeWidth="2" strokeLinejoin="round" className={b.earned ? 'fill-star stroke-star-edge' : 'fill-none stroke-muted'}>
                  <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" />
                </svg>
                {b.earned ? b.name : `${b.name} (chưa đạt)`}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
