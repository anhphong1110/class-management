import { Notice } from '@/components/ui/Notice'
import { callName } from '@/lib/domain/name'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { announcementColors } from '@/lib/announcements/types'
import { getAvatarLibrary, getHomeData, getStudentContext, getStudentProfile } from '@/lib/student/queries'
import { AvatarPicker } from './AvatarPicker'

const card = 'min-w-0 flex-[1_1_320px] flex flex-col gap-2.5 rounded-[26px] bg-white p-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'

// Layout và page render song song; hàm đã cache nên gọi lại không tốn thêm truy vấn.
export default async function StudentHome() {
  const ctx = await getStudentContext()
  const profile = await getStudentProfile()
  const home = await getHomeData(ctx)
  const canChange = ctx.settings.student_can_change_avatar && !ctx.preview && !!profile
  const library = canChange ? await getAvatarLibrary(ctx.classId) : []
  const greeting = profile ? `Xin chào, ${callName(profile.fullName)}!` : 'Xin chào!'
  const available = profile?.availableStars ?? 0
  const stats = profile
    ? [
        { label: 'Sao thi đua tích lũy', value: String(profile.competitionStars), sub: 'dùng để xếp hạng', color: '#2C37A8' },
        { label: 'Sao khả dụng', value: String(profile.availableStars), sub: 'dùng để đổi quà', color: '#7A4E00' },
        ...(profile.rankYear !== null
          ? [{ label: 'Thứ hạng của em', value: `#${profile.rankYear}`, sub: `trong ${profile.classSize} bạn`, color: '#5E35B1' }]
          : []),
      ]
    : []
  const now = new Date()
  return (
    <div className="flex flex-col gap-5">
      {ctx.preview && <Notice tone="success">Cô đang xem thử giao diện học sinh.</Notice>}
      <section className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[28px] bg-[linear-gradient(120deg,#33378F,#5C4FD8_55%,#9A66E6)] px-[34px] py-[30px] text-white max-sm:px-5">
        <div className="flex flex-[1_1_300px] flex-col gap-2">
          <div className="text-[13px] font-extrabold tracking-[.12em] text-[#FFE08A]">CÙNG HỌC – CÙNG CHƠI – CÙNG TỎA SÁNG</div>
          <h1 className="m-0 font-display text-[40px] font-extrabold leading-[1.1] max-sm:text-[32px]">{greeting}</h1>
          <p className="m-0 text-[17px] leading-normal text-[#EEF0FF]">
            Hôm nay em còn {available} sao khả dụng. Cố gắng thêm nhé, phi hành gia nhí!
          </p>
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

      {(home.showTimetable || home.showNews) && (
        <div className="flex flex-wrap items-stretch gap-4">
          {home.showTimetable && (
            <section className={card} aria-labelledby="today-h">
              <h2 id="today-h" className="m-0 font-display text-[22px] font-extrabold">
                Hôm nay học gì?
              </h2>
              {home.morning.length === 0 && <p className="m-0 font-bold text-muted">Hôm nay em được nghỉ.</p>}
              {home.morning.map((l) => (
                <div key={l.label} data-testid="lesson" className="flex items-center gap-2.5">
                  <span className="min-w-[54px] text-center text-[13px] font-extrabold text-muted">{l.label}</span>
                  <span className="flex-1 rounded-xl px-3 py-2 text-[14.5px] font-extrabold" style={{ background: l.bg, color: l.ink }}>
                    {l.subject}
                  </span>
                </div>
              ))}
            </section>
          )}
          {home.showNews && (
            <section className={card} aria-labelledby="news-h">
              <h2 id="news-h" className="m-0 font-display text-[22px] font-extrabold">
                Tín hiệu mới
              </h2>
              {home.news.length === 0 && <p className="m-0 font-bold text-muted">Chưa có thông báo mới.</p>}
              {home.news.map((n) => (
                <div key={n.id} data-testid="home-news" className="rounded-2xl bg-bg px-3.5 py-3">
                  <div className="text-[12.5px] font-extrabold" style={{ color: announcementColors(n.type)[1] }}>
                    {n.type} · {formatDayLabel(new Date(n.publishedAt), now)}
                  </div>
                  <div className="text-[15px] font-extrabold">{n.title}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
