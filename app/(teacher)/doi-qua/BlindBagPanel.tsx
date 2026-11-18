'use client'

import { useMemo, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { bagPrice, oddsOf } from '@/lib/blind-bag/odds'
import type { RewardView } from '@/lib/rewards/queries'
import { setBlindBagEnabled, setBlindBagItems } from './actions'

type Msg = { tone: 'success' | 'error'; text: string } | null

/** Cô bật túi mù, chọn món cho vào túi và xem giá túi cùng tỉ lệ (học sinh không thấy tỉ lệ). */
export function BlindBagPanel({ rewards, enabled }: { rewards: RewardView[]; enabled: boolean }) {
  const saved = useMemo(() => rewards.filter((r) => r.inBlindBag).map((r) => r.id), [rewards])
  const [picked, setPicked] = useState<Set<string>>(new Set(saved))
  const [on, setOn] = useState(enabled)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  const candidates = rewards.filter((r) => !r.hidden)
  // Cùng điều kiện với SQL: món nằm trong túi, không ẩn và còn hàng.
  const eligible = candidates.filter((r) => picked.has(r.id) && r.left >= 1)
  const costs = eligible.map((r) => r.cost)
  const price = bagPrice(costs)
  const odds = oddsOf(costs)
  const dirty = picked.size !== saved.length || saved.some((id) => !picked.has(id))

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function run(task: () => Promise<{ error?: string; message?: string }>, onFail?: () => void) {
    start(async () => {
      const res = await task()
      if (res.error) {
        setMsg({ tone: 'error', text: res.error })
        onFail?.()
      } else if (res.message) setMsg({ tone: 'success', text: res.message })
    })
  }

  return (
    <Card className="flex flex-col gap-3.5" data-testid="blind-bag-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-[560px]">
          <div className="font-display text-[22px] font-extrabold">Túi mù</div>
          <div className="text-[15px] font-semibold leading-normal text-muted">
            Học sinh trả giá trung bình của các món trong túi và nhận ngẫu nhiên một món. Món càng nhiều sao thì tỉ lệ ra càng thấp. Học sinh không thấy tỉ lệ.
          </div>
        </div>
        <div className="w-full max-w-[280px]">
          <Switch
            label="Bật túi mù"
            hint={on ? 'Học sinh đang thấy túi mù' : 'Đang tắt'}
            checked={on}
            disabled={pending}
            onChange={(next) => {
              setOn(next)
              run(() => setBlindBagEnabled(next), () => setOn(!next))
            }}
          />
        </div>
      </div>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {candidates.length === 0 ? (
        <p className="m-0 text-base font-semibold text-muted">Cô thêm phần thưởng trước, rồi chọn món cho vào túi nhé.</p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
            {candidates.map((r) => {
              const idx = eligible.findIndex((e) => e.id === r.id)
              const soldOut = r.left < 1
              return (
                <label
                  key={r.id}
                  className={`flex min-h-[52px] items-center gap-3 rounded-2xl border-2 px-3 py-2 ${picked.has(r.id) ? 'border-primary bg-primary-soft' : 'border-edge bg-bg'}`}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--primary-strong)]"
                    checked={picked.has(r.id)}
                    disabled={pending}
                    onChange={() => toggle(r.id)}
                    data-testid="bag-pick"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold">{r.name}</span>
                    <span className="block text-sm font-semibold text-muted">
                      {r.cost} sao{soldOut ? ' · hết hàng, tạm không vào túi' : ''}
                    </span>
                  </span>
                  {idx >= 0 && (
                    <span data-testid="bag-odds">
                      <Badge tone="star">{(odds[idx] * 100).toFixed(odds[idx] >= 0.1 ? 0 : 1)}%</Badge>
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-base font-extrabold text-ink" data-testid="bag-price">
              {eligible.length >= 2 ? (
                <span className="inline-flex items-center gap-1.5">
                  Giá túi: {price} <Icon d={ICONS.star} size={16} /> (trung bình {eligible.length} món)
                </span>
              ) : (
                <span className="text-danger">Cần ít nhất 2 món còn hàng thì túi mới mở được cho học sinh.</span>
              )}
            </div>
            <Button
              disabled={pending || !dirty}
              onClick={() => run(() => setBlindBagItems([...picked]))}
              data-testid="bag-save"
            >
              {pending ? 'Đang lưu…' : 'Lưu món trong túi'}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
