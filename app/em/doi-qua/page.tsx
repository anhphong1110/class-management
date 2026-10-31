import { Notice } from '@/components/ui/Notice'
import { giftsHeroHint, STUDENT_STAT } from '@/lib/student/gifts'
import { getGiftsData, getStudentProfile, requireStudentPage } from '@/lib/student/queries'
import { GiftsClient } from './GiftsClient'

const card = 'flex flex-col gap-2.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'

export default async function GiftsPage() {
  const ctx = await requireStudentPage('gifts')
  const profile = await getStudentProfile()
  const { gifts, requests, reserveOnRequest, enforceStars, requireApproval } = await getGiftsData(ctx)
  const available = profile?.availableStars ?? 0
  return (
    <div className="flex flex-col gap-5">
      {ctx.preview && <Notice tone="success">Cô đang xem thử giao diện học sinh, nút đổi quà tắt.</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 rounded-3xl bg-[linear-gradient(120deg,#33378F,#7A58E0)] px-6 py-[18px] text-white">
        <div className="font-display text-2xl font-extrabold">Em có {available} sao khả dụng</div>
        <div className="text-[14.5px] text-[#E9EBFF]">{giftsHeroHint(requireApproval)}</div>
      </div>
      <GiftsClient gifts={gifts} available={available} reserve={reserveOnRequest} enforceStars={enforceStars} preview={ctx.preview} />
      <section className={card} aria-labelledby="req-h">
        <h2 id="req-h" className="m-0 font-display text-[22px] font-extrabold">
          Yêu cầu đổi quà của em
        </h2>
        {requests.length === 0 && <p className="m-0 text-sm font-bold text-muted">Em chưa gửi yêu cầu nào.</p>}
        {requests.map((q) => {
          const [label, tint, ink] = STUDENT_STAT[q.status]
          return (
            <div key={q.id} data-testid="my-request" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-3.5 py-2.5">
              <span className="text-[15px] font-extrabold">
                {q.rewardName} <span className="text-[#7A4E00]">· {q.cost} sao</span>
              </span>
              <span className="rounded-full px-3 py-1 text-[12.5px] font-extrabold" style={{ background: tint, color: ink }}>
                {label}
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
