'use client'

import Link from 'next/link'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { PERIOD_LABELS, type Period } from '@/lib/domain/period'

export type RankRow = { id: string; name: string; stars: number; rank: number; avatar: AvatarValue }

const POD = {
  1: { h: 150, block: 'linear-gradient(180deg,#FFD76F,#F5A81C)', ink: '#4A3300', medal: 'Huy chương vàng', size: 118 },
  2: { h: 112, block: 'linear-gradient(180deg,#EEF1FA,#B9C0D8)', ink: '#2F3550', medal: 'Huy chương bạc', size: 92 },
  3: { h: 84, block: 'linear-gradient(180deg,#FBD2B6,#E09A6C)', ink: '#512810', medal: 'Huy chương đồng', size: 92 },
} as const

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
      <div role="tablist" className="flex flex-wrap gap-2 rounded-[22px] bg-white p-2.5 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
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
              className="flex min-h-12 flex-[1_1_120px] items-center justify-center rounded-2xl text-[15.5px] font-extrabold"
              style={{ background: on ? 'var(--primary-strong)' : '#F6F4FF', color: on ? '#fff' : '#3A3769' }}
            >
              {PERIOD_LABELS[k]}
            </Link>
          )
        })}
      </div>

      <div
        data-testid="podium"
        className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[30px] px-6 pt-7"
        style={{ background: 'linear-gradient(180deg,#2B2E7E 0%,#4C47C4 70%,#7B63E0 100%)' }}
      >
        <div className="relative text-center font-display text-2xl font-extrabold text-white">
          Bục vinh danh – {PERIOD_LABELS[period]}
        </div>
        <div className="relative flex w-full max-w-[760px] items-end justify-center gap-3.5">
          {order.map((r) => {
            const p = POD[r.rank as 1 | 2 | 3] ?? POD[3]
            return (
              <div key={r.id} data-testid="podium-step" className="flex min-w-0 flex-1 flex-col items-center">
                <AvatarImage avatar={r.avatar} size={p.size} crown={r.rank === 1 && r.stars > 0} />
                <div className="mt-1 text-center font-display text-[17px] font-bold leading-tight text-white">{r.name}</div>
                <div className="mb-2 flex items-center gap-1 text-base font-extrabold text-[#FFE08A]">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <polygon points={STAR} fill="#FFC857" />
                  </svg>
                  {r.stars} sao
                </div>
                <div
                  className="box-border flex w-full flex-col items-center gap-1.5 rounded-t-[20px] pt-3.5"
                  style={{ height: p.h, background: p.block }}
                >
                  <div
                    data-testid="podium-rank"
                    className="flex size-[46px] items-center justify-center rounded-full bg-white/55 font-display text-[26px] font-extrabold"
                    style={{ color: p.ink }}
                  >
                    {r.rank}
                  </div>
                  <div className="text-sm font-extrabold" style={{ color: p.ink }}>
                    {p.medal}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[28px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="font-display text-2xl font-extrabold">
            {showAll ? `Toàn bộ bảng xếp hạng (${rows.length} bạn)` : 'Top 5 ngôi sao sáng nhất'}
          </h2>
          <Link
            role="button"
            href={href(period, !showAll)}
            replace
            scroll={false}
            className="flex min-h-11 items-center rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-5 text-[14.5px] font-extrabold text-primary-ink"
          >
            {showAll ? 'Chỉ xem Top 5' : 'Xem toàn bộ bảng'}
          </Link>
        </div>
        <div className="text-[13.5px] text-[#5B5890]">
          Bằng điểm thì cùng thứ hạng. Hệ thống không ưu tiên theo giới tính hay tên.
        </div>
        {shown.map((r) => {
          const hi = r.rank <= 3
          const badge = r.rank === 1 ? '#FFC857' : r.rank === 2 ? '#DDE2F0' : r.rank === 3 ? '#F3BC97' : '#E4E0F7'
          return (
            <div
              key={r.id}
              data-testid="rank-row"
              className="flex items-center gap-3.5 rounded-[20px] px-4 py-2.5"
              style={{ background: hi ? '#FFF8E6' : '#F6F4FF' }}
            >
              <div
                data-testid="rank-badge"
                className="flex size-[42px] flex-none items-center justify-center rounded-full font-display text-xl font-extrabold"
                style={{ background: badge, color: hi ? '#3A2A00' : '#4A476E' }}
              >
                {r.rank}
              </div>
              <AvatarImage avatar={r.avatar} size={52} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="text-[16.5px] font-extrabold">{r.name}</div>
                <div className="h-2.5 overflow-hidden rounded-md bg-[#E9E6FA]">
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
              <div className="flex flex-none items-center gap-1.5 font-extrabold text-[#7A4E00]" style={{ fontSize: 19 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <polygon points={STAR} fill="#FFC857" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
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
