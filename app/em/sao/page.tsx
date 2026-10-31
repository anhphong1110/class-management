import { getStarsData, getStudentProfile, requireStudentPage } from '@/lib/student/queries'

const card = 'flex flex-col gap-2.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'

export default async function StarsPage() {
  const ctx = await requireStudentPage('stars')
  const profile = await getStudentProfile()
  const { history, badges } = await getStarsData(ctx)
  const stats = profile
    ? [
        { label: 'Sao thi đua tích lũy', value: String(profile.competitionStars), sub: 'dùng để xếp hạng', color: '#2C37A8' },
        { label: 'Sao khả dụng', value: String(profile.availableStars), sub: 'dùng để đổi quà', color: '#7A4E00' },
        ...(profile.rankYear !== null
          ? [{ label: 'Thứ hạng của em', value: `#${profile.rankYear}`, sub: `trong ${profile.classSize} bạn`, color: '#5E35B1' }]
          : []),
      ]
    : []
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {stats.map((s) => (
          <div key={s.label} data-testid="stat" className="rounded-[22px] bg-white px-5 py-[18px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
            <div className="text-sm font-bold text-muted">{s.label}</div>
            <div className="font-display text-4xl font-extrabold leading-[1.1]" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[12.5px] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      <section className={card} aria-labelledby="hist-h">
        <h2 id="hist-h" className="m-0 font-display text-[22px] font-extrabold">
          Lịch sử sao của em
        </h2>
        <div className="text-[13.5px] text-muted">Em chỉ thấy lịch sử của riêng mình, không thấy của bạn khác.</div>
        {history.length === 0 && <p className="m-0 font-bold text-muted">Em chưa có sao nào trong lịch sử.</p>}
        {history.map((h) => {
          const minus = h.delta < 0
          return (
            <div key={h.id} data-testid="history-row" className="flex items-center gap-3 rounded-2xl bg-bg px-3.5 py-2.5">
              <span
                className="min-w-[46px] rounded-xl px-2 py-1.5 text-center font-extrabold"
                style={{ background: minus ? '#FFE3EE' : '#FFF1CC', color: minus ? '#8E1B3B' : '#6E4700' }}
              >
                {h.delta > 0 ? `+${h.delta}` : h.delta}
              </span>
              <span className="flex-1 text-[15px] font-bold">{h.label}</span>
              <span className="text-[13px] text-muted">{h.dateLabel}</span>
            </div>
          )
        })}
      </section>

      {badges.length > 0 && (
        <section className={`${card} gap-3`} aria-labelledby="badge-h">
          <h2 id="badge-h" className="m-0 font-display text-[22px] font-extrabold">
            Huy hiệu của em
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {badges.map((b) => (
              <span
                key={b.id}
                data-testid="badge"
                data-earned={b.earned}
                className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-[14.5px] font-extrabold"
                style={
                  b.earned
                    ? { background: '#FFF8E6', color: '#6E4700', borderColor: '#FFC857' }
                    : { background: '#F1EFFC', color: '#4A476E', borderColor: '#D9D5F2' }
                }
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" fill={b.earned ? '#FFC857' : '#B9B5E8'} />
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
