'use client'

import { useState, useTransition } from 'react'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { giftButton, requestSuccessMessage } from '@/lib/student/gifts'
import type { GiftView } from '@/lib/student/queries'
import { requestReward } from './actions'

type Msg = { tone: 'success' | 'error'; text: string }

export function GiftsClient({
  gifts,
  available,
  reserve,
  enforceStars,
  preview,
}: {
  gifts: GiftView[]
  available: number
  reserve: boolean
  enforceStars: boolean
  preview: boolean
}) {
  const [asking, setAsking] = useState<GiftView | null>(null)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [pending, start] = useTransition()

  function confirm() {
    if (!asking || pending) return
    const gift = asking
    start(async () => {
      const res = await requestReward(gift.id)
      setAsking(null)
      setMsg(res.error ? { tone: 'error', text: res.error } : { tone: 'success', text: requestSuccessMessage(gift.name, gift.cost, reserve, res.approved) })
    })
  }

  return (
    <>
      {msg && (
        <div
          role={msg.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-[14px] px-4 py-3 text-[15px] font-bold ${msg.tone === 'error' ? 'bg-[#FFE3EA] text-[#8E1B3B]' : 'bg-[#DDF6F1] text-[#0B5A4D]'}`}
        >
          {msg.text}
        </div>
      )}
      {asking && (
        <div
          role="alertdialog"
          aria-label="Xác nhận đổi quà"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-2 border-[#4F5BD5] bg-[#EEF0FF] px-[18px] py-4"
        >
          <div className="text-base font-bold">
            Em muốn đổi &quot;{asking.name}&quot; với {asking.cost} sao?
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => setAsking(null)}
              className="min-h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-5 font-extrabold text-[#4A476E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className="min-h-12 cursor-pointer rounded-[14px] border-0 bg-[#4F5BD5] px-[22px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Gửi yêu cầu
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        {gifts.map((g) => {
          const btn = giftButton(g, available, enforceStars)
          // Khóa mọi nút khi đang gửi yêu cầu để không mở hộp xác nhận thứ hai.
          const locked = btn.disabled || preview || pending
          return (
            <div key={g.id} data-testid="gift" className="flex flex-col gap-2.5 rounded-3xl bg-white p-3.5 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
              <RewardVisual visual={g.visual} iconSize={58} className="h-[110px] w-full rounded-[18px]" />
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-lg font-extrabold leading-[1.2]">{g.name}</div>
                <div className="flex-none rounded-full bg-[#FFF1CC] px-2.5 py-1 text-[15px] font-extrabold text-[#7A4E00]">{g.cost} sao</div>
              </div>
              <div className="text-[13.5px] leading-[1.4] text-[#5B5890]">{g.description}</div>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setMsg(null)
                  setAsking(g)
                }}
                className={`min-h-12 rounded-[14px] border-0 text-[15px] font-extrabold ${
                  btn.disabled ? 'cursor-not-allowed bg-[#E4E0F7] text-[#4A476E]' : 'cursor-pointer bg-[#4F5BD5] text-white'
                } ${preview && !btn.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {btn.label}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
