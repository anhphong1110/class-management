'use client'

import Link from 'next/link'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { PERIOD_LABELS, type Period } from '@/lib/domain/period'

export type RankRow = { id: string; name: string; stars: number; rank: number; avatar: AvatarValue }

const POD = {
  1: { h: 150, block: 'linear-gradient(180deg,#FFD76F,#F5A81C)', ink: '#4A3300', medal: 'Huy chương vàng', size: 118 },
  2: { h: 112, block: 'linear-gradient(180deg,#EEF1FA,#B9C0D8)', ink: '#2F3550', medal: 'Huy chương bạc', size: 92 },
  3: { h: 84, block: 'linear-gradient(180deg,#FBD2B6,#E09A6C)', ink: '#512810', medal: 'Huy chương đồng', size: 92 },
} as const

/** Màu huy chương cạnh tên ở bảng bên dưới (icon + số hạng, không chỉ màu). */
const MEDAL_TEXT = { 1: 'text-[#B07A00]', 2: 'text-[#5F6A8C]', 3: 'text-[#A8602F]' } as const
const BADGE = { 1: 'bg-star', 2: 'bg-[#DDE2F0]', 3: 'bg-[#F3BC97]' } as const

const STAR = '12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9'

function href(period: Period, all: boolean) {
  return `/xep-hang?ky=${period}${all ? '&tat-ca=1' : ''}`
}

export function LeaderboardClient({ rows, period, showAll }: { rows: RankRow[]; period: Period; showAll: boolean }) {
  const max = rows[0]?.stars ?? 0
  const top3 = rows.slice(0, 3)
  const order = [top3[1], top3[0], top3[2]].filter((r): r is RankRow => !!r)
  const shown = showAll ? rows : rows.slice(0, 5)

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Khoảng thời gian" className="clay-card flex flex-wrap gap-2.5 p-2.5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((k) => {
          const on = k === period
          return (
            <Link
              key={k}
              role="tab"
              aria-selected={on}
              href={href(k, showAll)}
              replace
              scroll={false}
              className={`clay-press flex min-h-12 flex-[1_1_120px] items-center justify-center gap-1.5 rounded-ctl border-2 text-[15.5px] font-extrabold no-underline ${
                on
                  ? 'border-primary-strong bg-primary-strong text-white [--edge:var(--primary-deep)]'
                  : 'border-edge bg-white text-primary-deep [--edge:var(--primary-edge)] hover:bg-primary-soft'
              }`}
            >
              {on ? <Icon d={ICONS.check} size={18} /> : null}
              {PERIOD_LABELS[k]}
            </Link>
          )
        })}
      </div>

      <div
        data-testid="podium"
        className="clay-card relative flex flex-col items-center gap-2 overflow-hidden px-6 pt-7"
        style={{ background: 'linear-gradient(180deg,var(--primary-soft) 0%,#FFF3C4 100%)' }}
      >
        <div className="relative text-center font-display text-2xl font-extrabold text-ink">
          Bục vinh danh – {PERIOD_LABELS[period]}
        </div>
        {order.length === 0 ? (
          <div className="w-full max-w-[420px] pb-7">
            <EmptyState title="Chưa có bạn nào trên bục" icon={ICONS.trophy}>
              Khi lớp có học sinh và có sao thi đua, top 3 sẽ đứng ở đây.
            </EmptyState>
          </div>
        ) : null}
        <div className="relative flex w-full max-w-[760px] items-end justify-center gap-3.5">
          {order.map((r) => {
            const p = POD[r.rank as 1 | 2 | 3] ?? POD[3]
            return (
              <div key={r.id} data-testid="podium-step" className="flex min-w-0 flex-1 flex-col items-center">
                <AvatarImage avatar={r.avatar} size={p.size} crown={r.rank === 1 && r.stars > 0} />
                <div className="mt-1 text-center font-display text-[17px] font-bold leading-tight text-ink">{r.name}</div>
                <div className="mb-2 flex items-center gap-1 text-base font-extrabold text-star-ink">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <polygon points={STAR} fill="#FFC93C" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  {r.stars} sao
                </div>
                <div
                  className="box-border flex w-full flex-col items-center gap-1.5 rounded-t-[20px] pt-3.5"
                  style={{ height: p.h, background: p.block }}
                >
                  <div
                    data-testid="podium-rank"
                    className="flex size-[46px] items-center justify-center rounded-full bg-white/60 font-display text-[26px] font-extrabold"
                    style={{ color: p.ink }}
                  >
                    {r.rank}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-extrabold" style={{ color: p.ink }}>
                    <Icon d={ICONS.trophy} size={16} />
                    {p.medal}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="clay-card flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="m-0 font-display text-2xl font-extrabold">
            {showAll ? `Toàn bộ bảng xếp hạng (${rows.length} bạn)` : 'Top 5 ngôi sao sáng nhất'}
          </h2>
          <ButtonLink
            variant="secondary"
            role="button"
            href={href(period, !showAll)}
            replace
            scroll={false}
            className="!text-[14.5px]"
          >
            {showAll ? 'Chỉ xem Top 5' : 'Xem toàn bộ bảng'}
          </ButtonLink>
        </div>
        <div className="text-[13.5px] font-semibold text-muted">
          Bằng điểm thì cùng thứ hạng. Hệ thống không ưu tiên theo giới tính hay tên.
        </div>
        {shown.length === 0 ? (
          <EmptyState title="Chưa có học sinh nào" icon={ICONS.users}>
            Cô thêm học sinh ở trang Quản lý học sinh để bảng xếp hạng có người nhé.
          </EmptyState>
        ) : null}
        {shown.map((r) => {
          const medal = r.rank >= 1 && r.rank <= 3 ? (r.rank as 1 | 2 | 3) : null
          return (
            <div
              key={r.id}
              data-testid="rank-row"
              className={`flex items-center gap-3.5 rounded-panel border-2 px-4 py-2.5 ${
                medal ? 'border-[#FFE08A] bg-[#FFF8E6]' : 'border-transparent bg-bg'
              }`}
            >
              <div
                data-testid="rank-badge"
                className={`flex size-[42px] flex-none items-center justify-center rounded-full font-display text-xl font-extrabold ${
                  medal ? `${BADGE[medal]} text-[#3A2A00]` : 'bg-primary-soft text-primary-deep'
                }`}
              >
                {r.rank}
              </div>
              <AvatarImage avatar={r.avatar} size={52} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[16.5px] font-extrabold">
                  {r.name}
                  {medal ? <Icon d={ICONS.trophy} size={18} className={MEDAL_TEXT[medal]} /> : null}
                </div>
                <div className="h-2.5 overflow-hidden rounded-md bg-primary-soft">
                  <div
                    data-testid="rank-bar"
                    className="h-full rounded-md"
                    style={{
                      width: `${max > 0 ? Math.min(100, Math.max(0, Math.round((r.stars / max) * 100))) : 0}%`,
                      background: 'linear-gradient(90deg,var(--primary),#F46FA5)',
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-none items-center gap-1.5 text-[19px] font-extrabold text-star-ink">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <polygon points={STAR} fill="#FFC93C" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                <span data-testid="rank-stars">{r.stars}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
