import Link from 'next/link'
import { requireTeacher } from '@/lib/auth/session'
import { brandSentence } from '@/lib/classes/brand'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { Header } from '@/components/layout/Header'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { StatCard } from '@/components/ui/StatCard'
import { getOverview, type Top3Row } from '@/lib/overview/queries'
import { teacherGreetingName } from '@/lib/overview/stats'
import { announcementColors } from '@/lib/announcements/types'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { getTodayTasks, type TodayTasks } from './today'

const STAR = '12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9'
const ARROW = 'M5 12h14M13 6l6 6-6 6'
const USER_X = 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 8l5 5M22 8l-5 5'

// Thứ tự khớp với buildOverviewStats (lib/overview/stats.ts); mỗi thẻ dẫn tới trang liên quan.
const STATS = [
  { icon: ICONS.users, tone: 'blue', href: '/hoc-sinh' },
  { icon: ICONS.checkCircle, tone: 'mint', href: '/diem-danh' },
  { icon: USER_X, tone: 'pink', href: '/diem-danh' },
  { icon: ICONS.star, tone: 'star', href: '/thi-dua' },
  { icon: ICONS.gift, tone: 'pink', href: '/doi-qua' },
  { icon: ICONS.trophy, tone: 'blue', href: '/xep-hang' },
] as const

const ACTIONS = [
  { label: 'Điểm danh', href: '/diem-danh', bg: 'bg-[#DDF6F1]', ink: 'text-[#0B6B5F]', d: ICONS.checkCircle },
  { label: 'Cộng sao', href: '/thi-dua', bg: 'bg-[#FFF1CC]', ink: 'text-star-ink', d: ICONS.star },
  { label: 'Trừ sao', href: '/thi-dua?che-do=tru', bg: 'bg-[#FFE3EE]', ink: 'text-[#9E2257]', d: ICONS.minus },
  { label: 'Đổi quà', href: '/doi-qua', bg: 'bg-[#F0E8FF]', ink: 'text-[#5E35B1]', d: ICONS.gift },
  { label: 'Xem bảng xếp hạng', href: '/xep-hang', bg: 'bg-[#E3F4FF]', ink: 'text-[#0F5E8F]', d: ICONS.trophy },
] as const

const MEDAL = {
  1: { medalBg: '#FFC93C', medalInk: '#4A3300', bg: 'linear-gradient(180deg,#FFF4D1,#FFFFFF)', size: 124 },
  2: { medalBg: '#DDE2F0', medalInk: '#2F3550', bg: 'linear-gradient(180deg,#ECEFFA,#FFFFFF)', size: 96 },
  3: { medalBg: '#F3BC97', medalInk: '#512810', bg: 'linear-gradient(180deg,#FFE8D8,#FFFFFF)', size: 96 },
} as const

const DELTA_STYLE = {
  award: 'bg-star-soft text-star-ink',
  penalty: 'bg-danger-soft text-danger-deep',
  reversal: 'bg-primary-soft text-primary-deep',
  request: 'bg-[#F0E8FF] text-[#5E35B1]',
} as const

const heroBtn = 'clay-press inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-6 text-base font-extrabold no-underline'

function Hero({ greeting, coverUrl, brand }: { greeting: string; coverUrl: string | null; brand: string }) {
  return (
    <div
      className="clay-card relative flex flex-wrap items-center justify-between gap-4 overflow-hidden px-8 py-7 text-ink"
      style={{ background: 'linear-gradient(120deg,var(--primary-soft) 0%,#FFFFFF 45%,#FFF3C4 75%,#FFE1EE 100%)' }}
    >
      {coverUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-testid="hero-cover" src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg,rgba(255,255,255,.94),rgba(255,255,255,.78) 60%,rgba(255,255,255,.35))' }} />
        </>
      ) : null}
      <div className="relative z-[1] flex flex-[1_1_320px] flex-col gap-2.5">
        <div className="text-[13px] font-extrabold tracking-[.12em] text-primary-deep">CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG</div>
        <h2 className="m-0 font-display text-[40px] font-extrabold leading-[1.1] text-ink">Xin chào, {greeting}!</h2>
        <p className="m-0 max-w-[460px] text-lg leading-normal text-muted">
          Chào mừng cô trở lại {brand}. Hôm nay cả phi hành đoàn đã sẵn sàng cất cánh.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/diem-danh" className={`${heroBtn} bg-primary-strong text-white [--edge:var(--primary-deep)]`}>
            Bắt đầu điểm danh
          </Link>
          <Link href="/thi-dua" className={`${heroBtn} border-2 border-primary-strong bg-white text-primary-strong [--edge:var(--primary-edge)]`}>
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
            <circle cx="40" cy="30" r="3" fill="#FFC93C" />
            <circle cx="290" cy="40" r="2.5" fill="#B9A7F8" />
            <circle cx="260" cy="170" r="3" fill="#FFC93C" />
            <circle cx="70" cy="170" r="2" fill="#B9A7F8" />
          </g>
          <ellipse cx="170" cy="110" rx="118" ry="26" fill="none" stroke="#FF9ACB" strokeWidth="7" opacity=".5" transform="rotate(-18 170 110)" />
          <circle cx="170" cy="105" r="62" fill="url(#mp1)" />
          <path d="M120 80 Q170 62 222 84" stroke="#fff" strokeOpacity=".35" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M114 118 Q170 136 226 112" stroke="#C2557A" strokeOpacity=".3" strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse
            cx="170" cy="110" rx="118" ry="26" fill="none" stroke="#FF9ACB" strokeWidth="7" opacity=".9"
            transform="rotate(-18 170 110)" strokeDasharray="120 400" strokeDashoffset="-190"
          />
          <g transform="translate(236 30) rotate(35)">
            <path d="M0 -34 C14 -22 14 6 8 22 L-8 22 C-14 6 -14 -22 0 -34Z" fill="url(#mr1)" stroke="#B9A7F8" strokeWidth="2" />
            <circle data-testid="hero-window" cx="0" cy="-8" r="7" fill="currentColor" className="text-primary" />
            <circle cx="-2" cy="-10" r="2.2" fill="#fff" opacity=".8" />
            <path d="M-8 14 L-18 28 L-6 22Z M8 14 L18 28 L6 22Z" fill="#F46FA5" />
            <path d="M-5 22 L0 40 L5 22Z" fill="#FFC93C" />
          </g>
        </svg>
      )}
    </div>
  )
}

/** Khối "Việc hôm nay": chỉ hiện những việc có dữ liệu thật, mỗi việc một nút bấm tới trang xử lý. */
function TodayBlock({ tasks }: { tasks: TodayTasks }) {
  const items: { key: string; icon: string; title: string; hint: string; href: string; cta: string }[] = []
  if (tasks.attendanceTaken === false) {
    items.push({ key: 'att', icon: ICONS.calendar, title: 'Hôm nay chưa điểm danh', hint: 'Mất khoảng một phút cho cả lớp.', href: '/diem-danh', cta: 'Điểm danh ngay' })
  }
  if (tasks.pendingGifts !== null && tasks.pendingGifts > 0) {
    items.push({
      key: 'gift',
      icon: ICONS.gift,
      title: `${tasks.pendingGifts} yêu cầu đổi quà đang chờ cô duyệt`,
      hint: 'Các bạn đang chờ câu trả lời.',
      href: '/doi-qua',
      cta: 'Xem yêu cầu',
    })
  }
  const known = tasks.attendanceTaken !== null || tasks.pendingGifts !== null
  if (!known) return null
  return (
    <section data-testid="today-tasks" aria-labelledby="today-h" className="flex flex-col gap-3">
      <h2 id="today-h" className="m-0 font-display text-2xl font-extrabold">Việc hôm nay</h2>
      {items.length === 0 ? (
        <div className="clay-card flex items-center gap-3 bg-success-soft px-5 py-4 [--primary-edge:#B2EEDD]">
          <Icon d={ICONS.checkCircle} size={26} className="text-success-deep" />
          <p className="m-0 text-base font-extrabold text-success-deep">Cô đã làm xong các việc cần làm hôm nay.</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
          {items.map((it) => (
            <li key={it.key}>
              <Link
                href={it.href}
                className="clay-card clay-press flex min-h-[84px] items-center gap-3.5 bg-star-soft px-4 py-3 text-ink no-underline [--edge:#FFE08A] [--primary-edge:#FFE08A]"
              >
                <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-white text-star-ink">
                  <Icon d={it.icon} size={26} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-extrabold leading-snug">{it.title}</span>
                  <span className="text-sm font-semibold text-muted">{it.hint}</span>
                </span>
                <span className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-[14px] bg-primary-strong px-3.5 text-sm font-extrabold text-white">
                  {it.cta}
                  <Icon d={ARROW} size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function Page() {
  const user = await requireTeacher()
  const now = new Date()
  const [info, data, tasks] = await Promise.all([
    getClassHeaderInfo(user.classId),
    getOverview(user.classId, now),
    getTodayTasks(user.classId, now),
  ])
  const order: Top3Row[] = [data.top3[1], data.top3[0], data.top3[2]].filter((r): r is Top3Row => !!r)

  return (
    <>
      <Header title="Tổng quan" subtitle={`Trạm chỉ huy của lớp ${info.short}`} />
      <div className="flex flex-col gap-5">
        <Hero greeting={teacherGreetingName(data.teacherName)} coverUrl={data.coverUrl} brand={brandSentence({ class_name: info.className })} />

        <TodayBlock tasks={tasks} />

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {data.stats.map((st, i) => {
            const s = STATS[i] ?? STATS[0]
            return (
              <div key={st.label} data-testid="stat" className="flex flex-col [&>*]:flex-1">
                <StatCard icon={s.icon} tone={s.tone} href={s.href} value={st.value} label={st.label} note={st.sub} />
              </div>
            )
          })}
        </div>

        <section data-testid="top3" className="clay-card flex flex-col gap-[18px] px-7 py-[26px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 font-display text-[26px] font-extrabold">Top 3 phi hành gia xuất sắc</h2>
              <div className="text-sm font-semibold text-muted">Xếp theo sao thi đua tích lũy, không bị trừ khi đổi quà</div>
            </div>
            <Link href="/xep-hang" className="clay-press inline-flex min-h-11 items-center rounded-[16px] bg-primary-strong px-5 font-extrabold text-white no-underline [--edge:var(--primary-deep)]">
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
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[13px] font-extrabold" style={{ background: m.medalBg, color: m.medalInk }}>
                    <Icon d={ICONS.trophy} size={16} />
                    {`Hạng ${t.rank}`}
                  </div>
                  <div className="font-display text-xl font-bold leading-tight">{t.name}</div>
                  <div className="flex items-center gap-1.5 text-lg font-extrabold text-star-ink">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <polygon points={STAR} fill="#FFC93C" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
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
                className={`clay-card clay-press flex min-h-[120px] flex-col items-center justify-center gap-2.5 px-3 py-5 text-center text-base font-extrabold no-underline [--edge:var(--primary-edge)] ${a.bg} ${a.ink}`}
              >
                <Icon d={a.d} size={34} />
                {a.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-stretch gap-4">
          <section data-testid="activity" className="clay-card flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 p-6">
            <h2 className="m-0 font-display text-[22px] font-extrabold">Hoạt động gần đây</h2>
            {data.activity.length === 0 ? (
              <EmptyState title="Chưa có hoạt động nào." icon={ICONS.star}>
                Cộng sao hoặc điểm danh, hoạt động mới sẽ hiện ở đây.
              </EmptyState>
            ) : null}
            {data.activity.map((ac) => {
              const label = ac.delta === null ? 'Quà' : ac.delta > 0 ? `+${ac.delta}` : `${ac.delta}`
              return (
                <div key={ac.key} data-testid="activity-row" className="flex items-center gap-3">
                  <div className={`min-w-12 flex-none rounded-xl px-2 py-1.5 text-center text-sm font-extrabold ${DELTA_STYLE[ac.kind]}`}>
                    {label}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold">{ac.text}</div>
                    <div className="text-[13px] font-semibold text-muted">{ac.meta}</div>
                  </div>
                </div>
              )
            })}
          </section>

          <section data-testid="news" className="clay-card flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 font-display text-[22px] font-extrabold">Tín hiệu từ trạm chỉ huy</h2>
              <Link href="/thong-bao" className="inline-flex min-h-11 items-center text-sm font-extrabold text-primary-strong underline-offset-2 hover:underline">
                Xem tất cả
              </Link>
            </div>
            {data.news.length === 0 ? (
              <EmptyState title="Chưa có thông báo nào." icon={ICONS.bell}>
                Khi cô đăng thông báo, tin mới sẽ hiện ở đây.
              </EmptyState>
            ) : null}
            {data.news.map((n) => {
              const [tint, ink] = announcementColors(n.type)
              return (
                <div key={n.id} className="flex flex-col gap-1 rounded-2xl bg-bg px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.type ? (
                      <span className="rounded-full px-2.5 py-[3px] text-xs font-extrabold" style={{ background: tint, color: ink }}>
                        {n.type}
                      </span>
                    ) : null}
                    <span className="text-[12.5px] font-semibold text-muted">{formatDayLabel(new Date(n.publishedAt), now)}</span>
                  </div>
                  <div className="text-[15.5px] font-extrabold">{n.title}</div>
                  <div className="text-sm leading-[1.45] text-muted">{n.body}</div>
                </div>
              )
            })}
          </section>
        </div>
      </div>
    </>
  )
}
