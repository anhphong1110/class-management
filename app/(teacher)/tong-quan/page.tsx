import Link from 'next/link'
import { requireTeacher } from '@/lib/auth/session'
import { brandSentence } from '@/lib/classes/brand'
import { getClassHeaderInfo } from '@/lib/classes/queries'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { StatCard } from '@/components/ui/StatCard'
import { getOverview, type Top3Row } from '@/lib/overview/queries'
import { teacherGreetingName } from '@/lib/overview/stats'
import { announcementColors } from '@/lib/announcements/types'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { getTodayTasks, type TodayTasks } from './today'
import { Hero } from './Hero'
import { Top3Podium } from './Top3Podium'

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

const DELTA_STYLE = {
  award: 'bg-star-soft text-star-ink',
  penalty: 'bg-danger-soft text-danger-deep',
  reversal: 'bg-primary-soft text-primary-deep',
  request: 'bg-[#F0E8FF] text-[#5E35B1]',
} as const

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
                <span className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-ctl bg-primary-strong px-3.5 text-sm font-extrabold text-white">
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
        <Hero greeting={teacherGreetingName(data.teacherName)} coverUrl={data.coverUrl} brand={brandSentence({ class_name: info.className, brand_title: info.brandTitle })} />

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

        <Top3Podium order={order} />

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
