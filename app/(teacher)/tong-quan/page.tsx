import Link from 'next/link'
import { requireTeacher } from '@/lib/auth/session'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { Header } from '@/components/layout/Header'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { getOverview, type Top3Row } from '@/lib/overview/queries'
import { teacherGreetingName } from '@/lib/overview/stats'
import { formatDayLabel } from '@/lib/domain/relative-time'

const CARD = 'shadow-[0_6px_20px_rgba(102,117,232,.10)]'
const STAR = '12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9'

const STAT_STYLE = [
  { tint: '#E8EBFF', ink: '#3F4BC4', d: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6' },
  { tint: '#DDF6F1', ink: '#0E7C6F', d: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
  { tint: '#FFE3EE', ink: '#B02A63', d: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 8l5 5M22 8l-5 5' },
  { tint: '#FFF1CC', ink: '#8A5A00', d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { tint: '#F0E8FF', ink: '#6A3FC0', d: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z' },
  { tint: '#E3F4FF', ink: '#12689C', d: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' },
]

const GIFT = 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z'
const CUP = 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3'
const ACTIONS = [
  { label: 'Điểm danh', href: '/diem-danh', bg: '#DDF6F1', ink: '#0B6B5F', d: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
  { label: 'Cộng sao', href: '/thi-dua', bg: '#FFF1CC', ink: '#7A4E00', d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
  { label: 'Trừ sao', href: '/thi-dua?che-do=tru', bg: '#FFE3EE', ink: '#9E2257', d: 'M5 12h14' },
  { label: 'Đổi quà', href: '/doi-qua', bg: '#F0E8FF', ink: '#5E35B1', d: GIFT },
  { label: 'Xem bảng xếp hạng', href: '/xep-hang', bg: '#E3F4FF', ink: '#0F5E8F', d: CUP },
]

const MEDAL = {
  1: { medal: 'Hạng 1', medalBg: '#FFC857', medalInk: '#4A3300', bg: 'linear-gradient(180deg,#FFF4D1,#FFFFFF)', size: 124 },
  2: { medal: 'Hạng 2', medalBg: '#DDE2F0', medalInk: '#2F3550', bg: 'linear-gradient(180deg,#ECEFFA,#FFFFFF)', size: 96 },
  3: { medal: 'Hạng 3', medalBg: '#F3BC97', medalInk: '#512810', bg: 'linear-gradient(180deg,#FFE8D8,#FFFFFF)', size: 96 },
} as const

const NEWS_COLOR: Record<string, [string, string]> = {
  'Thông báo chung': ['#E8EBFF', '#2C37A8'],
  'Nhắc bài': ['#E8EBFF', '#2C37A8'],
  'Lịch kiểm tra': ['#FFE3EE', '#8E1B3B'],
  'Hoạt động': ['#DDF6F1', '#0B5A4D'],
  'Sự kiện của lớp': ['#FFF1CC', '#6E4700'],
}

const DELTA_STYLE = {
  award: { tint: '#FFF1CC', ink: '#7A4E00' },
  penalty: { tint: '#FFE3EE', ink: '#9E2257' },
  reversal: { tint: '#E8EBFF', ink: '#3441B5' },
  request: { tint: '#F0E8FF', ink: '#5E35B1' },
} as const

function Hero({ greeting, coverUrl }: { greeting: string; coverUrl: string | null }) {
  return (
    <div
      className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[28px] px-9 py-8 text-white"
      style={{ background: 'linear-gradient(120deg,#33378F 0%,#5C4FD8 55%,#9A66E6 100%)' }}
    >
      {coverUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-testid="hero-cover" src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg,rgba(51,55,143,.85),rgba(92,79,216,.55))' }} />
        </>
      ) : null}
      <div className="relative z-[1] flex flex-[1_1_320px] flex-col gap-2.5">
        <div className="text-[13px] font-extrabold tracking-[.12em] text-[#FFE08A]">CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG</div>
        <h2 className="m-0 font-display text-[44px] font-extrabold leading-[1.1]">Xin chào, {greeting}!</h2>
        <p className="m-0 max-w-[460px] text-lg leading-normal text-[#EEF0FF]">
          Chào mừng cô trở lại Trạm không gian Năm 8. Hôm nay cả phi hành đoàn đã sẵn sàng cất cánh.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/diem-danh" className="inline-flex min-h-11 items-center rounded-full bg-[#FFC857] px-[22px] py-3 font-extrabold text-[#3B2A00]">
            Bắt đầu điểm danh
          </Link>
          <Link
            href="/thi-dua"
            className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-white/50 bg-white/[.16] px-[22px] py-3 font-bold text-white"
          >
            Cộng sao cho lớp
          </Link>
        </div>
      </div>
      {coverUrl ? null : (
        <svg data-testid="hero-art" viewBox="0 0 320 200" width="300" height="188" aria-hidden="true" className="relative max-w-full flex-none">
          <defs>
            <radialGradient id="mp1" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#FFE9B0" />
              <stop offset=".55" stopColor="#FFB86B" />
              <stop offset="1" stopColor="#E5718F" />
            </radialGradient>
            <linearGradient id="mr1" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#D8D2FF" />
            </linearGradient>
          </defs>
          <g>
            <circle cx="40" cy="30" r="3" fill="#FFE08A" />
            <circle cx="290" cy="40" r="2.5" fill="#fff" />
            <circle cx="260" cy="170" r="3" fill="#FFE08A" />
            <circle cx="70" cy="170" r="2" fill="#fff" />
          </g>
          <ellipse cx="170" cy="110" rx="118" ry="26" fill="none" stroke="#FFD7F0" strokeWidth="7" opacity=".55" transform="rotate(-18 170 110)" />
          <circle cx="170" cy="105" r="62" fill="url(#mp1)" />
          <path d="M120 80 Q170 62 222 84" stroke="#fff" strokeOpacity=".35" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M114 118 Q170 136 226 112" stroke="#C2557A" strokeOpacity=".3" strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse
            cx="170" cy="110" rx="118" ry="26" fill="none" stroke="#FFD7F0" strokeWidth="7" opacity=".9"
            transform="rotate(-18 170 110)" strokeDasharray="120 400" strokeDashoffset="-190"
          />
          <g transform="translate(236 30) rotate(35)">
            <path d="M0 -34 C14 -22 14 6 8 22 L-8 22 C-14 6 -14 -22 0 -34Z" fill="url(#mr1)" />
            <circle data-testid="hero-window" cx="0" cy="-8" r="7" fill="currentColor" className="text-primary" />
            <circle cx="-2" cy="-10" r="2.2" fill="#fff" opacity=".8" />
            <path d="M-8 14 L-18 28 L-6 22Z M8 14 L18 28 L6 22Z" fill="#F46FA5" />
            <path d="M-5 22 L0 40 L5 22Z" fill="#FFC857" />
          </g>
        </svg>
      )}
    </div>
  )
}

export default async function Page() {
  const user = await requireTeacher()
  const now = new Date()
  const [info, data] = await Promise.all([getClassHeaderInfo(user.classId), getOverview(user.classId, now)])
  const order: Top3Row[] = [data.top3[1], data.top3[0], data.top3[2]].filter((r): r is Top3Row => !!r)

  return (
    <>
      <Header title="Tổng quan" subtitle={`Trạm chỉ huy của lớp ${info.short}`} />
      <div className="flex flex-col gap-5">
        <Hero greeting={teacherGreetingName(data.teacherName)} coverUrl={data.coverUrl} />

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {data.stats.map((st, i) => (
            <div key={st.label} data-testid="stat" className={`flex items-center gap-3.5 rounded-[22px] bg-white px-5 py-[18px] ${CARD}`}>
              <div className="flex size-[52px] flex-none items-center justify-center rounded-2xl" style={{ background: STAT_STYLE[i].tint }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={STAT_STYLE[i].ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={STAT_STYLE[i].d} />
                </svg>
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="text-sm font-bold text-[#5B5890]">{st.label}</div>
                <div className="font-display text-[32px] font-extrabold leading-[1.1] text-[#231F4D]">{st.value}</div>
                <div className="text-[12.5px] text-[#5B5890]">{st.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <section data-testid="top3" className={`flex flex-col gap-[18px] rounded-[28px] bg-white px-7 py-[26px] ${CARD}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 font-display text-[26px] font-extrabold">Top 3 phi hành gia xuất sắc</h2>
              <div className="text-sm text-[#5B5890]">Xếp theo sao thi đua tích lũy, không bị trừ khi đổi quà</div>
            </div>
            <Link href="/xep-hang" className="inline-flex min-h-11 items-center rounded-full bg-[#4F5BD5] px-[22px] py-[11px] font-extrabold text-white">
              Xem bảng xếp hạng
            </Link>
          </div>
          <div className="flex flex-wrap items-end justify-center gap-4 pt-1.5">
            {order.map((t) => {
              const m = MEDAL[Math.min(3, Math.max(1, t.rank)) as 1 | 2 | 3]
              return (
                <div
                  key={t.id}
                  data-testid="top3-card"
                  className="relative flex max-w-[280px] flex-[1_1_200px] flex-col items-center gap-1.5 overflow-hidden rounded-3xl px-4 pb-[18px] pt-5 text-center"
                  style={{ background: m.bg }}
                >
                  <AvatarImage avatar={t.avatar} size={m.size} crown={t.rank === 1 && t.stars > 0} />
                  <div className="rounded-full px-3.5 py-1 text-[13px] font-extrabold" style={{ background: m.medalBg, color: m.medalInk }}>
                    {`Hạng ${t.rank}`}
                  </div>
                  <div className="font-display text-xl font-bold leading-tight">{t.name}</div>
                  <div className="flex items-center gap-1.5 text-lg font-extrabold text-[#7A4E00]">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <polygon points={STAR} fill="#FFC857" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                    {t.stars} sao
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-2xl font-extrabold">Thao tác nhanh</h2>
          <div data-testid="quick-actions" className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            {ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-[22px] px-3 py-5 text-center text-base font-extrabold transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-[0_14px_28px_rgba(79,91,213,.22)]"
                style={{ background: a.bg, color: a.ink }}
              >
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke={a.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={a.d} />
                </svg>
                {a.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-stretch gap-4">
          <section data-testid="activity" className={`flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-[26px] bg-white p-6 ${CARD}`}>
            <h2 className="m-0 font-display text-[22px] font-extrabold">Hoạt động gần đây</h2>
            {data.activity.length === 0 ? <div className="text-[15px] text-[#5B5890]">Chưa có hoạt động nào.</div> : null}
            {data.activity.map((ac) => {
              const st = DELTA_STYLE[ac.kind]
              const label = ac.delta === null ? 'Quà' : ac.delta > 0 ? `+${ac.delta}` : `${ac.delta}`
              return (
                <div key={ac.key} data-testid="activity-row" className="flex items-center gap-3">
                  <div className="min-w-12 flex-none rounded-xl px-2 py-1.5 text-center text-sm font-extrabold" style={{ background: st.tint, color: st.ink }}>
                    {label}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold">{ac.text}</div>
                    <div className="text-[13px] text-[#5B5890]">{ac.meta}</div>
                  </div>
                </div>
              )
            })}
          </section>

          <section data-testid="news" className={`flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-[26px] bg-white p-6 ${CARD}`}>
            <div className="flex items-center justify-between">
              <h2 className="m-0 font-display text-[22px] font-extrabold">Tín hiệu từ trạm chỉ huy</h2>
              <Link href="/thong-bao" className="inline-flex min-h-11 items-center text-sm font-bold text-[#4F5BD5]">
                Xem tất cả
              </Link>
            </div>
            {data.news.length === 0 ? <div className="text-[15px] text-[#5B5890]">Chưa có thông báo nào.</div> : null}
            {data.news.map((n) => {
              const [tint, ink] = NEWS_COLOR[n.type] ?? NEWS_COLOR['Thông báo chung']
              return (
                <div key={n.id} className="flex flex-col gap-1 rounded-2xl bg-[#F6F4FF] px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.type ? (
                      <span className="rounded-full px-2.5 py-[3px] text-xs font-extrabold" style={{ background: tint, color: ink }}>
                        {n.type}
                      </span>
                    ) : null}
                    <span className="text-[12.5px] text-[#5B5890]">{formatDayLabel(new Date(n.publishedAt), now)}</span>
                  </div>
                  <div className="text-[15.5px] font-extrabold">{n.title}</div>
                  <div className="text-sm leading-[1.45] text-[#4A476E]">{n.body}</div>
                </div>
              )
            })}
          </section>
        </div>
      </div>
    </>
  )
}
