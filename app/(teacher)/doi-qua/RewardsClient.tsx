'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { formatRelative } from '@/lib/domain/relative-time'
import type { RewardRequestView, RewardView } from '@/lib/rewards/queries'
import { STAT } from '@/lib/rewards/status'
import { approveRequest, deliverRequest, rejectRequest, setRewardHidden } from './actions'
import { RewardEditor } from './RewardEditor'

type Editing = { kind: 'new' } | { kind: 'edit'; id: string } | null
type Msg = { tone: 'success' | 'error'; text: string } | null

export function RewardsClient({
  rewards,
  requests,
  now,
}: {
  rewards: RewardView[]
  requests: RewardRequestView[]
  now: string
}) {
  const [editing, setEditing] = useState<Editing>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const inflight = useRef(new Set<string>())
  const [, startTransition] = useTransition()
  const trigger = useRef<HTMLElement | null>(null)
  const open = (next: Editing) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setEditing(next)
  }
  const closeEditor = useCallback(() => {
    setEditing(null)
    setTimeout(() => trigger.current?.focus(), 0)
  }, [])
  const nowDate = new Date(now)

  const editingReward = editing?.kind === 'edit' ? (rewards.find((r) => r.id === editing.id) ?? null) : null
  const pendingCount = requests.filter((q) => q.status === 'pending').length

  function run(key: string, task: () => Promise<{ error?: string; message?: string }>) {
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setBusy(new Set(inflight.current))
    startTransition(async () => {
      try {
        const res = await task()
        if (res.error) setMsg({ tone: 'error', text: res.error })
        else if (res.message) setMsg({ tone: 'success', text: res.message })
      } finally {
        inflight.current.delete(key)
        setBusy(new Set(inflight.current))
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-[26px] bg-[linear-gradient(120deg,#33378F,#7A58E0)] px-[26px] py-[22px] text-white">
        <div className="max-w-[560px]">
          <div className="font-display text-[26px] font-extrabold">Đổi sao lấy quà</div>
          <div className="text-[15.5px] leading-normal text-[#E9EBFF]">
            Học sinh gửi yêu cầu, hệ thống giữ trước sao và quà. Cô duyệt hoặc từ chối, sao chỉ bị trừ chính thức khi cô duyệt. Sao đổi quà không ảnh hưởng thứ hạng thi đua.
          </div>
        </div>
        <button
          type="button"
          onClick={() => open({ kind: 'new' })}
          className="min-h-12 cursor-pointer rounded-2xl border-0 bg-star px-6 text-base font-extrabold text-[#3B2A00]"
        >
          + Thêm phần thưởng
        </button>
      </div>

      {editing && (editing.kind === 'new' || editingReward) && (
        <RewardEditor
          key={editing.kind === 'new' ? 'new' : editing.id}
          reward={editingReward}
          onClose={closeEditor}
        />
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        {rewards.map((w) => {
          const out = w.left <= 0
          const editingThis = editing?.kind === 'edit' && editing.id === w.id
          const hiddenKey = `hide:${w.id}`
          return (
            <div
              key={w.id}
              data-testid="reward-card"
              className={`flex flex-col gap-2.5 rounded-[24px] bg-white p-3.5 shadow-[0_6px_20px_rgba(102,117,232,0.10)] ${w.hidden ? 'opacity-60' : ''}`}
            >
              <RewardVisual visual={w.visual} iconSize={64} className="h-[120px] w-full rounded-[18px]" />
              <div className="flex items-start justify-between gap-2">
                <h3 className="m-0 font-display text-[19px] font-extrabold leading-[1.2]">{w.name}</h3>
                <div className="flex flex-none items-center gap-1 rounded-full bg-[#FFF1CC] px-2.5 py-1 text-[15px] font-extrabold text-[#7A4E00]">
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                    <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" fill="#FFC857" stroke="#E0A020" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  {w.cost}
                </div>
              </div>
              <div className="text-[13.5px] leading-[1.4] text-muted">{w.description}</div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex gap-1.5">
                  <span
                    className="rounded-full px-2.5 py-1 text-[12.5px] font-extrabold"
                    style={{ background: out ? '#FFE3EA' : '#DDF6F1', color: out ? '#8E1B3B' : '#0B5A4D' }}
                  >
                    {out ? 'Hết quà' : 'Còn quà'}
                  </span>
                  {w.hidden && (
                    <span className="rounded-full bg-[#E9E7F7] px-2.5 py-1 text-[12.5px] font-extrabold text-[#4A476E]">Đã ẩn</span>
                  )}
                </span>
                <span className="text-[13px] font-bold text-[#4A476E]">
                  {`Còn ${w.left}${w.held ? ` (đang giữ ${w.held})` : ''}`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => open({ kind: 'edit', id: w.id })}
                  className={`min-h-11 flex-1 cursor-pointer rounded-xl border-2 bg-white text-sm font-extrabold text-primary-ink ${editingThis ? 'border-primary-strong' : 'border-[#D9D5F2]'}`}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  disabled={busy.has(hiddenKey)}
                  onClick={() => run(hiddenKey, () => setRewardHidden(w.id, !w.hidden))}
                  className="min-h-11 flex-1 cursor-pointer rounded-xl border-[1.5px] border-[#D9D5F2] bg-white text-sm font-extrabold text-[#4A476E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {w.hidden ? 'Hiện' : 'Ẩn'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <section className="flex flex-col gap-3 rounded-[28px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-2xl font-extrabold">Yêu cầu và lịch sử đổi quà</h2>
          <span className="rounded-full bg-primary-soft px-3.5 py-1.5 text-sm font-extrabold text-primary-ink">
            {pendingCount} yêu cầu chờ duyệt
          </span>
        </div>
        {msg && (
          <div
            role={msg.tone === 'error' ? 'alert' : 'status'}
            className={`rounded-[14px] px-4 py-3 text-[15px] font-bold ${msg.tone === 'error' ? 'bg-[#FFE3EA] text-[#8E1B3B]' : 'bg-[#DDF6F1] text-[#0B5A4D]'}`}
          >
            {msg.text}
          </div>
        )}
        {requests.length === 0 && <p className="m-0 text-sm text-muted">Chưa có yêu cầu đổi quà nào.</p>}
        <div className="overflow-x-auto">
          <div className="flex min-w-[640px] flex-col gap-2">
            {requests.map((q) => {
              const [label, tint, ink] = STAT[q.status]
              const key = `req:${q.id}`
              const locked = busy.has(key)
              return (
                <div
                  key={q.id}
                  data-testid="request-row"
                  className="grid grid-cols-[1.5fr_1.4fr_.7fr_1fr_1.6fr] items-center gap-2.5 rounded-2xl bg-bg px-3.5 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AvatarImage avatar={q.avatar} size={40} />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-[15px] font-extrabold">{q.studentName}</span>
                      <span className="text-xs text-muted">{formatRelative(new Date(q.createdAt), nowDate)}</span>
                    </div>
                  </div>
                  <div className="text-[14.5px] font-bold">{q.rewardName}</div>
                  <div className="text-[14.5px] font-extrabold text-[#7A4E00]">{q.cost} sao</div>
                  <div>
                    <span className="rounded-full px-2.5 py-1 text-[12.5px] font-extrabold" style={{ background: tint, color: ink }}>
                      {label}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    {q.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => run(key, () => approveRequest(q.id))}
                          className="min-h-11 cursor-pointer rounded-xl border-0 bg-[#12794F] px-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => run(key, () => rejectRequest(q.id))}
                          className="min-h-11 cursor-pointer rounded-xl border-[1.5px] border-[#C0314E] bg-white px-3.5 text-sm font-extrabold text-[#A22441] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {q.status === 'approved' && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => run(key, () => deliverRequest(q.id))}
                        className="min-h-11 cursor-pointer rounded-xl border-0 bg-primary-strong px-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Đã trao quà
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
