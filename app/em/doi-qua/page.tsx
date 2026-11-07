import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { giftsHeroHint, STUDENT_STAT } from '@/lib/student/gifts'
import { getGiftsData, getStudentProfile, requireStudentPage } from '@/lib/student/queries'
import type { RewardRequestStatus } from '@/lib/rewards/queries'
import { GiftsClient } from './GiftsClient'

/** Icon đi kèm chữ của từng trạng thái yêu cầu để không chỉ dựa vào màu. */
const STATUS_ICON: Record<RewardRequestStatus, string> = {
  pending: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18',
  approved: ICONS.checkCircle,
  delivered: ICONS.gift,
  rejected: ICONS.x,
}

export default async function GiftsPage() {
  const ctx = await requireStudentPage('gifts')
  const profile = await getStudentProfile()
  const { gifts, requests, reserveOnRequest, enforceStars, requireApproval } = await getGiftsData(ctx)
  const available = profile?.availableStars ?? 0
  return (
    <div className="flex flex-col gap-5">
      {ctx.preview && <Notice tone="info">Đây là bản xem thử giao diện học sinh, nút đổi quà đang tắt.</Notice>}
      <div className="clay-card flex flex-wrap items-center gap-x-5 gap-y-2.5 bg-[linear-gradient(120deg,var(--primary-soft),#FFF3C4)] px-6 py-[18px] text-ink">
        <span className="flex size-14 flex-none items-center justify-center rounded-full bg-star text-star-ink">
          <Icon d={ICONS.star} size={30} />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
          <div className="font-display text-2xl font-extrabold">Em có {available} sao khả dụng</div>
          <div className="text-base font-semibold text-muted">{giftsHeroHint(requireApproval)}</div>
        </div>
      </div>
      <GiftsClient gifts={gifts} available={available} reserve={reserveOnRequest} enforceStars={enforceStars} preview={ctx.preview} />
      <section className="clay-card flex flex-col gap-3 px-6 py-[22px] max-sm:px-4" aria-labelledby="req-h">
        <h2 id="req-h" className="m-0 font-display text-[22px] font-extrabold">
          Yêu cầu đổi quà của em
        </h2>
        {requests.length === 0 && (
          <EmptyState title="Em chưa gửi yêu cầu nào." icon={ICONS.gift}>
            Chọn một món quà ở trên rồi bấm Đổi quà nhé.
          </EmptyState>
        )}
        {requests.map((q) => {
          const [label, tint, ink] = STUDENT_STAT[q.status]
          return (
            <div key={q.id} data-testid="my-request" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-4 py-3">
              <span className="text-base font-extrabold">
                {q.rewardName} <span className="text-star-ink">· {q.cost} sao</span>
              </span>
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-extrabold" style={{ background: tint, color: ink }}>
                <Icon d={STATUS_ICON[q.status]} size={16} />
                {label}
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
