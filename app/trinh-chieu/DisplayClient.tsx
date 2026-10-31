'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { announcementColors } from '@/lib/announcements/types'
import { DISPLAY_BLOCKS, nextBlockIndex, type DisplayBlock } from '@/lib/display/logic'
import type { DisplayData } from '@/lib/display/queries'

const REFRESH_MS = 5 * 60_000
const CYCLE_MS = 15_000
const STAGE_W = 1600
const BADGE = ['#FFC857', '#DDE2F0', '#F3BC97', '#E4E0F7', '#E4E0F7']
const PANEL = 'bg-white/10 rounded-[30px]'

export function DisplayClient({ data }: { data: DisplayData }) {
  const router = useRouter()
  const [auto, setAuto] = useState(false)
  const [index, setIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const stageRef = useRef<HTMLDivElement>(null)
  const blocks: DisplayBlock[] = DISPLAY_BLOCKS.filter((b) => b !== 'pinned' || data.pinned)
  const active = auto ? blocks[index % blocks.length] : null

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  // Khổ 16:9 co giãn theo cửa sổ (không phóng to quá 100% chiều ngang thiết kế khi cao hơn).
  useLayoutEffect(() => {
    const fit = () => {
      const h = stageRef.current?.offsetHeight || 900
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / h))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [data])

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setIndex((i) => nextBlockIndex(i, blocks.length)), CYCLE_MS)
    return () => clearInterval(id)
  }, [auto, blocks.length])

  useEffect(() => {
    if (!active) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.querySelector(`[data-block="${active}"]`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [active])

  const ring = (b: DisplayBlock): CSSProperties =>
    active === b ? { outline: '5px solid #FFE08A', outlineOffset: 4, boxShadow: '0 0 36px rgba(255,224,138,.55)' } : {}
  const block = (b: DisplayBlock, cls: string, children: ReactNode, style?: CSSProperties) => (
    <div data-block={b} data-active={active === b ? 'true' : 'false'} className={`${cls} motion-safe:transition-shadow`} style={{ ...style, ...ring(b) }}>
      {children}
    </div>
  )

  const pinnedColors = data.pinned ? announcementColors(data.pinned.type) : null

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-[#1E2160] font-body text-white">
      <div
        ref={stageRef}
        style={{
          width: STAGE_W,
          flex: '0 0 auto',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
        className="relative box-border flex min-h-[900px] flex-col gap-[22px] overflow-hidden bg-[radial-gradient(circle_at_20%_15%,#4B4FB5_0%,#2B2E7E_45%,#1E2160_100%)] px-9 py-7"
      >
        <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute left-0 top-0 h-full w-full">
          <g className="motion-safe:animate-[tw_3s_ease-in-out_infinite]">
            <circle cx="80" cy="70" r="3" fill="#FFE08A" />
            <circle cx="520" cy="40" r="2" fill="#fff" />
            <circle cx="930" cy="90" r="3" fill="#FFE08A" />
            <circle cx="40" cy="330" r="2" fill="#fff" />
            <circle cx="970" cy="420" r="2.5" fill="#fff" />
            <circle cx="600" cy="580" r="2" fill="#FFE08A" />
          </g>
        </svg>

        <header className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative size-[72px] flex-none overflow-hidden rounded-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-truong.jpg" alt="Logo trường Tiểu học Chính Nghĩa" className="absolute -left-0.5 -top-0.5 size-[76px] max-w-none object-cover" />
            </div>
            <div>
              <h1 className="m-0 font-display text-[40px] font-extrabold leading-[1.05]">
                TRẠM KHÔNG GIAN <span className="text-[#FFD36B]">NĂM 8</span>
              </h1>
              <div className="text-lg font-bold text-[#E4E7FF]">
                Lớp {data.cls.className} · {data.cls.slogan}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <div className="font-display text-[34px] font-extrabold leading-[1.1]">{data.dateLabel}</div>
              <div className="text-base text-[#E4E7FF]">Năm học {data.cls.schoolYear}</div>
            </div>
            <button
              type="button"
              aria-pressed={auto}
              onClick={() => {
                setIndex(0)
                setAuto((v) => !v)
              }}
              className={`inline-flex min-h-12 cursor-pointer items-center rounded-[14px] border-2 px-5 text-base font-extrabold text-white focus-visible:outline-2 focus-visible:outline-white ${
                auto ? 'border-[#FFE08A] bg-white/20' : 'border-white/60 bg-transparent'
              }`}
            >
              Tự động chuyển khối
            </button>
            <Link
              href="/tong-quan"
              className="inline-flex min-h-12 items-center rounded-[14px] border-2 border-white/60 px-5 text-base font-extrabold text-white no-underline focus-visible:outline-2 focus-visible:outline-white"
            >
              Thoát trình chiếu
            </Link>
          </div>
        </header>

        <div className="relative flex flex-1 flex-wrap items-stretch gap-[22px]">
          {block(
            'top5',
            `${PANEL} flex min-w-0 flex-col gap-3 px-[30px] py-[26px]`,
            <>
              <h2 className="m-0 font-display text-[34px] font-extrabold">Top 5 ngôi sao sáng nhất</h2>
              {data.top5.map((r, i) => (
                <div
                  key={r.id}
                  data-testid="top5-row"
                  className="flex items-center gap-[18px] rounded-[22px] px-5 py-2.5 text-[#231F4D]"
                  style={{ background: r.crown ? '#FFF4D1' : '#fff' }}
                >
                  <div
                    className="flex size-[54px] flex-none items-center justify-center rounded-full font-display text-[28px] font-extrabold text-[#3A2A00]"
                    style={{ background: BADGE[i] ?? BADGE[4] }}
                  >
                    {r.rank}
                  </div>
                  <AvatarImage avatar={r.avatar} size={72} crown={r.crown} />
                  <div className="flex-1 font-display text-[30px] font-extrabold">{r.name}</div>
                  <div className="font-display text-[32px] font-extrabold text-[#7A4E00]">{r.stars} sao</div>
                </div>
              ))}
            </>,
            { flex: '3 1 560px' },
          )}

          <div className="flex min-w-0 flex-col gap-[22px]" style={{ flex: '2 1 380px' }}>
            <div className={`${PANEL} flex flex-col gap-2.5 px-7 py-[22px]`}>
              {block(
                'week',
                'flex flex-col gap-2.5 rounded-2xl',
                <>
                  <h2 className="m-0 font-display text-[28px] font-extrabold">Sao sáng trong tuần</h2>
                  {data.weekTop3.length === 0 ? (
                    <div className="text-xl font-bold text-[#E4E7FF]">Tuần này chưa có sao thi đua.</div>
                  ) : (
                    data.weekTop3.map((w) => (
                      <div key={w.id} data-testid="week-row" className="flex items-center gap-3 text-[22px] font-extrabold">
                        <span className="min-w-[62px] rounded-xl bg-[#FFC857] px-2.5 py-1 text-center text-[#3B2A00]">+{w.stars}</span>
                        {w.name}
                      </div>
                    ))
                  )}
                </>,
              )}
              {block(
                'highlight',
                'mt-1.5 flex flex-col gap-2.5 rounded-2xl',
                <>
                  <h2 className="m-0 font-display text-2xl font-extrabold text-[#FFE08A]">Thành tích nổi bật</h2>
                  <p className="m-0 text-xl font-bold leading-normal">{data.highlight}</p>
                </>,
              )}
            </div>
            {block(
              'today',
              `${PANEL} flex flex-col gap-2 px-7 py-[22px]`,
              <>
                <h2 className="m-0 font-display text-[28px] font-extrabold">Hôm nay học gì?</h2>
                {data.today.length === 0 ? (
                  <div className="text-xl font-bold text-[#E4E7FF]">Hôm nay không có tiết học.</div>
                ) : (
                  data.today.map((t) => (
                    <div key={t.label} data-testid="today-row" className="flex items-center gap-3 text-[22px] font-extrabold">
                      <span className="min-w-[74px] text-base text-[#E4E7FF]">{t.label}</span>
                      <span className="flex-1 rounded-xl px-3.5 py-1.5" style={{ background: t.bg, color: t.ink }}>
                        {t.subject}
                      </span>
                    </div>
                  ))
                )}
              </>,
            )}
          </div>
        </div>

        {data.pinned &&
          pinnedColors &&
          block(
            'pinned',
            'relative flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-3xl bg-[#FFC857] px-7 py-4 text-[#3B2A00]',
            <>
              <span
                className="rounded-xl px-3 py-1 text-lg font-extrabold uppercase tracking-[.1em]"
                style={{ background: pinnedColors[0], color: pinnedColors[1] }}
              >
                {data.pinned.type}
              </span>
              <span className="font-display text-[28px] font-extrabold">{data.pinned.title}</span>
            </>,
          )}
      </div>
    </main>
  )
}
