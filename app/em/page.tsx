import Link from 'next/link'
import { NAV_TONES, STUDENT_NAV_TONES } from '@/components/layout/nav'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { callName } from '@/lib/domain/name'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { announcementColors } from '@/lib/announcements/types'
import { STUDENT_NAV, visibleStudentPages, type StudentPageId } from '@/lib/student/flags'
import { getAvatarLibrary, getHomeData, getStudentContext, getStudentProfile } from '@/lib/student/queries'
import { AvatarPicker } from './AvatarPicker'
import { LinkButton } from './LinkButton'
import { StudentStats } from './StudentStats'

/** Tên gọi và lời gợi ý ngắn cho từng ô lối tắt (không trùng nhãn menu để không nhầm hai liên kết). */
const SHORTCUTS: Partial<Record<StudentPageId, { label: string; hint: string }>> = {
  stars: { label: 'Lịch sử sao', hint: 'Xem em đã được cộng sao gì' },
  rank: { label: 'Bảng xếp hạng', hint: 'Xem ai đang sáng nhất lớp' },
  tt: { label: 'Thời khóa biểu', hint: 'Xem hôm nay học môn gì' },
  att: { label: 'Điểm danh', hint: 'Xem em đi học đủ chưa' },
  news: { label: 'Thông báo', hint: 'Tin mới từ cô giáo' },
}

// Layout và page render song song; hàm đã cache nên gọi lại không tốn thêm truy vấn.
export default async function StudentHome() {
  const ctx = await getStudentContext()
  const profile = await getStudentProfile()
  const home = await getHomeData(ctx)
  const canChange = ctx.settings.student_can_change_avatar && !ctx.preview && !!profile
  const library = canChange ? await getAvatarLibrary(ctx.classId) : []
  const greeting = profile ? `Xin chào, ${callName(profile.fullName)}!` : 'Xin chào!'
  const available = profile?.availableStars ?? 0
  const pages = visibleStudentPages(ctx.settings)
  // Một nút chính duy nhất: đổi quà nếu có, không thì xem sao. Ô lối tắt bỏ trang đã có nút chính.
  const mainId: StudentPageId | null = pages.has('gifts') ? 'gifts' : pages.has('stars') ? 'stars' : null
  const shortcuts = STUDENT_NAV.filter((n) => n.id !== 'home' && n.id !== mainId && pages.has(n.id) && SHORTCUTS[n.id])
  const now = new Date()
  return (
    <div className="flex flex-col gap-5">
      {ctx.preview && <Notice tone="info">Đây là bản xem thử giao diện học sinh.</Notice>}
      <section className="clay-card relative flex flex-wrap items-center justify-between gap-5 overflow-hidden bg-[linear-gradient(120deg,var(--primary-soft)_0%,#FFFFFF_55%,#FFF3C4_100%)] px-[30px] py-[26px] text-ink max-sm:px-5">
        <div className="flex flex-[1_1_300px] flex-col items-start gap-2.5">
          <div className="text-base font-extrabold tracking-[.08em] text-primary-deep">CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG</div>
          <h1 className="m-0 font-display text-[40px] font-extrabold leading-[1.1] max-sm:text-[32px]">{greeting}</h1>
          <p className="m-0 text-[18px] font-semibold leading-normal">
            Hôm nay em còn {available} sao khả dụng. Cố gắng thêm nhé, phi hành gia nhí!
          </p>
          {mainId === 'gifts' && (
            <LinkButton href="/em/doi-qua" className="mt-1">
              <Icon d={ICONS.gift} size={22} />
              Đi đổi quà
            </LinkButton>
          )}
          {mainId === 'stars' && (
            <LinkButton href="/em/sao" className="mt-1">
              <Icon d={ICONS.star} size={22} />
              Xem lịch sử sao
            </LinkButton>
          )}
        </div>
        {profile && (
          <AvatarPicker
            current={profile.avatar}
            currentId={profile.avatarId}
            library={library.map((a) => ({ id: a.id, label: a.label, avatar: a.avatar }))}
            enabled={canChange}
          />
        )}
      </section>

      {profile && (
        <StudentStats
          profile={profile}
          hrefs={{
            stars: pages.has('stars') ? '/em/sao' : undefined,
            gifts: pages.has('gifts') ? '/em/doi-qua' : undefined,
            rank: pages.has('rank') ? '/em/xep-hang' : undefined,
          }}
        />
      )}

      {shortcuts.length > 0 && (
        <section aria-labelledby="go-h" className="flex flex-col gap-3">
          <h2 id="go-h" className="m-0 font-display text-[22px] font-extrabold">
            Em muốn xem gì?
          </h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
            {shortcuts.map((n) => {
              const s = SHORTCUTS[n.id]!
              return (
                <li key={n.id} className="flex">
                  <Link
                    href={n.href}
                    className="clay-card clay-press flex min-h-[88px] w-full items-center gap-4 px-4 py-3 text-ink no-underline [--edge:var(--primary-edge)]"
                  >
                    <span className={`flex size-14 flex-none items-center justify-center rounded-2xl ${NAV_TONES[STUDENT_NAV_TONES[n.id] ?? 'blue']}`}>
                      <Icon d={n.icon} size={30} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-display text-xl font-extrabold leading-tight">{s.label}</span>
                      <span className="text-base font-semibold text-muted">{s.hint}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(home.showTimetable || home.showNews) && (
        <div className="flex flex-wrap items-stretch gap-4">
          {home.showTimetable && (
            <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-3" role="region" aria-labelledby="today-h">
              <h2 id="today-h" className="m-0 font-display text-[22px] font-extrabold">
                Hôm nay học gì?
              </h2>
              {home.morning.length === 0 && (
                <EmptyState title="Hôm nay em được nghỉ." icon={ICONS.calendar}>
                  Em nghỉ ngơi thật vui nhé!
                </EmptyState>
              )}
              {home.morning.map((l) => (
                <div key={l.label} data-testid="lesson" className="flex items-center gap-3">
                  <span className="min-w-[60px] text-center text-base font-extrabold text-muted">{l.label}</span>
                  <span className="flex-1 rounded-[14px] px-3.5 py-2.5 text-base font-extrabold" style={{ background: l.bg, color: l.ink }}>
                    {l.subject}
                  </span>
                </div>
              ))}
            </Card>
          )}
          {home.showNews && (
            <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-3" role="region" aria-labelledby="news-h">
              <h2 id="news-h" className="m-0 font-display text-[22px] font-extrabold">
                Tín hiệu mới
              </h2>
              {home.news.length === 0 && (
                <EmptyState title="Chưa có thông báo mới." icon={ICONS.bell}>
                  Khi cô có tin mới, em sẽ thấy ở đây.
                </EmptyState>
              )}
              {home.news.map((n) => (
                <div key={n.id} data-testid="home-news" className="rounded-2xl bg-bg px-4 py-3">
                  <div className="text-[15px] font-extrabold" style={{ color: announcementColors(n.type)[1] }}>
                    {n.type} · {formatDayLabel(new Date(n.publishedAt), now)}
                  </div>
                  <div className="text-base font-extrabold">{n.title}</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
