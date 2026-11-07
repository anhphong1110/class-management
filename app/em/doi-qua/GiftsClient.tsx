'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { ProgressBar } from '@/components/ui/ProgressBar'
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
  const msgRef = useRef<HTMLDivElement>(null)

  // Kết quả hiện ở đầu danh sách; cuộn tới để em thấy ngay dù đang ở cuối trang.
  useEffect(() => {
    if (msg) msgRef.current?.scrollIntoView?.({ block: 'center' })
  }, [msg])

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
        <div ref={msgRef} className="scroll-mt-24">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
      <ConfirmDialog
        open={!!asking}
        title="Em có chắc không?"
        message={asking ? `Em muốn đổi "${asking.name}" với ${asking.cost} sao?` : ''}
        confirmLabel="Gửi yêu cầu"
        cancelLabel="Hủy"
        pending={pending}
        onConfirm={confirm}
        onCancel={() => {
          if (!pending) setAsking(null)
        }}
      />
      {gifts.length === 0 && (
        <EmptyState title="Chưa có món quà nào." icon={ICONS.gift}>
          Cô giáo sẽ sớm thêm quà để em đổi nhé.
        </EmptyState>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {gifts.map((g) => {
          const btn = giftButton(g, available, enforceStars)
          // Khóa mọi nút khi đang gửi yêu cầu để không mở hộp xác nhận thứ hai.
          const locked = btn.disabled || preview || pending
          const missing = g.cost - available
          // Chỉ hiện thanh tiến độ khi thiếu sao là lý do duy nhất khiến nút bị khóa.
          const showProgress = g.left > 0 && enforceStars && missing > 0
          return (
            <div key={g.id} data-testid="gift" className="clay-card flex flex-col gap-3 p-3.5">
              <RewardVisual visual={g.visual} iconSize={58} className="h-[120px] w-full rounded-panel" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 font-display text-xl font-extrabold leading-[1.2]">{g.name}</div>
                <Badge tone="star">
                  <Icon d={ICONS.star} size={14} />
                  {g.cost} sao
                </Badge>
              </div>
              {g.description && <div className="text-base leading-[1.4] text-muted">{g.description}</div>}
              <div className="mt-auto flex flex-col gap-2.5">
                {showProgress && <ProgressBar value={available} max={g.cost} tone="star" label={`Còn ${missing} sao nữa là đổi được`} />}
                <Button
                  size="lg"
                  variant={btn.disabled ? 'secondary' : 'primary'}
                  disabled={locked}
                  onClick={() => {
                    setMsg(null)
                    setAsking(g)
                  }}
                  className={`w-full text-center leading-tight ${btn.disabled ? 'border-edge! text-muted! disabled:opacity-100!' : ''}`}
                >
                  {btn.label}
                </Button>
                {preview && !btn.disabled && <p className="m-0 text-[15px] font-semibold text-muted">Đang xem thử nên chưa đổi quà được.</p>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
