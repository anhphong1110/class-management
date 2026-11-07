import { ICONS } from '@/components/ui/Icon'
import { StatCard } from '@/components/ui/StatCard'
import type { StudentProfile } from '@/lib/student/queries'

type Hrefs = { stars?: string; gifts?: string; rank?: string }

/**
 * Ba ô số to của học sinh (sao tích lũy, sao khả dụng, thứ hạng).
 * `href` có thì ô bấm được; mỗi ô giữ data-testid="stat" cho e2e (bọc bằng `contents` để không đổi bố cục).
 */
export function StudentStats({ profile, hrefs = {} }: { profile: StudentProfile; hrefs?: Hrefs }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
      <div data-testid="stat" className="contents">
        <StatCard
          icon={ICONS.star}
          art="/brand/overview/stat-sao.webp"
          tone="star"
          value={profile.competitionStars}
          label="Sao thi đua tích lũy"
          note="dùng để xếp hạng"
          href={hrefs.stars}
        />
      </div>
      <div data-testid="stat" className="contents">
        <StatCard
          icon={ICONS.gift}
          art="/brand/overview/stat-doi-qua.webp"
          tone="mint"
          value={profile.availableStars}
          label="Sao khả dụng"
          note="dùng để đổi quà"
          href={hrefs.gifts}
        />
      </div>
      {profile.rankYear !== null && (
        <div data-testid="stat" className="contents">
          <StatCard
            icon={ICONS.trophy}
            art="/brand/overview/stat-noi-bat.webp"
            tone="pink"
            value={`#${profile.rankYear}`}
            label="Thứ hạng của em"
            note={`trong ${profile.classSize} bạn`}
            href={hrefs.rank}
          />
        </div>
      )}
    </div>
  )
}
