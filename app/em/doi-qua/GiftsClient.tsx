'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { BlindBagStage, type TearResult } from '@/components/blind-bag/BlindBagStage'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { giftButton, requestSuccessMessage } from '@/lib/student/gifts'
import type { BlindBagView, GiftView } from '@/lib/student/queries'
import { openBlindBag, requestReward } from './actions'

type Msg = { tone: 'success' | 'error'; text: string }

export function GiftsClient({
  gifts,
  available,
  reserve,
  enforceStars,
  preview,
  blindBag = null,
}: {
  gifts: GiftView[]
  available: number
  reserve: boolean
  enforceStars: boolean
  preview: boolean
  blindBag?: BlindBagView | null
}) {
  const router = useRouter()
  const [askBag, setAskBag] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const bagResult = useRef<{ name: string; approved: boolean; price: number } | null>(null)
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

  const tearBag = useCallback(async (): Promise<TearResult> => {
    const res = await openBlindBag()
    if (res.error !== undefined) return { error: res.error }
    bagResult.current = { name: res.gift.name, approved: res.approved, price: res.price }
    return { gift: res.gift }
  }, [])
  const closeStage = useCallback(
    (opened: boolean) => {
      setStageOpen(false)
      if (opened) {
        const r = bagResult.current
        if (r) setMsg({ tone: 'success', text: requestSuccessMessage(r.name, r.price, reserve, r.approved) })
        // Làm mới sau khi xé xong để số sao và danh sách yêu cầu mới hiện, không lộ kết quả sớm.
        router.refresh()
      }
      bagResult.current = null
    },
    [reserve, router],
  )
  const bagButton = blindBag ? giftButton({ left: 1, cost: blindBag.price }, available, enforceStars) : null

  return (
    <>
      <BlindBagStage open={stageOpen} onTear={tearBag} onClose={closeStage} onError={(text) => setMsg({ tone: 'error', text })} />
      {blindBag && (
        <ConfirmDialog
          open={askBag}
          title="Mở túi mù?"
          message={`Em muốn mở túi mù với ${blindBag.price} sao? Món quà được bốc ngẫu nhiên khi em xé túi, và chỉ trừ sao khi em đã xé.`}
          confirmLabel="Mở túi"
          cancelLabel="Hủy"
          onConfirm={() => {
            setAskBag(false)
            setMsg(null)
            setStageOpen(true)
          }}
          onCancel={() => setAskBag(false)}
        />
      )}
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
      {blindBag && bagButton && (
        <div data-testid="blind-bag-card" className="clay-card flex flex-col gap-3 bg-[linear-gradient(135deg,var(--primary-soft),var(--color-star-soft))] p-3.5 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blind-bag/bag-front.webp" alt="" className="mx-auto h-[150px] w-auto flex-none drop-shadow-[0_8px_8px_rgba(35,31,77,0.25)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-2xl font-extrabold leading-[1.2]">Túi mù bí ẩn</div>
              <Badge tone="star">
                <Icon d={ICONS.star} size={14} />
                {blindBag.price} sao
              </Badge>
            </div>
            <div className="text-base leading-[1.4] text-muted">Xé túi để nhận một món quà bất ngờ. Món càng nhiều sao thì càng khó ra!</div>
            <div className="flex flex-wrap gap-1.5" aria-label="Các món có thể ra">
              {blindBag.items.map((it) => (
                <span key={it.name} className="rounded-full bg-white/70 px-2.5 py-0.5 text-[15px] font-bold text-ink">
                  {it.name}
                </span>
              ))}
            </div>
            <Button
              size="lg"
              variant={bagButton.disabled ? 'secondary' : 'primary'}
              disabled={bagButton.disabled || preview || pending || stageOpen}
              onClick={() => {
                setMsg(null)
                setAskBag(true)
              }}
              className={`w-full text-center leading-tight sm:w-auto ${bagButton.disabled ? 'border-edge! text-muted! disabled:opacity-100!' : ''}`}
            >
              {bagButton.disabled ? bagButton.label : 'Mở túi mù'}
            </Button>
          </div>
        </div>
      )}
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
