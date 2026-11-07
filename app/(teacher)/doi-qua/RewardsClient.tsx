'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { RewardVisual } from '@/components/rewards/RewardVisual'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { formatRelative } from '@/lib/domain/relative-time'
import type { RewardRequestStatus, RewardRequestView, RewardView } from '@/lib/rewards/queries'
import { STAT } from '@/lib/rewards/status'
import { approveRequest, deliverRequest, rejectRequest, setRewardHidden } from './actions'
import { RewardEditor } from './RewardEditor'

type Editing = { kind: 'new' } | { kind: 'edit'; id: string } | null
type Msg = { tone: 'success' | 'error'; text: string } | null

const CLOCK = 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18'

/** Trạng thái luôn có icon và chữ, không chỉ màu. Nhãn lấy từ STAT dùng chung. */
const BADGE: Record<RewardRequestStatus, { tone: 'star' | 'neutral' | 'success' | 'danger'; icon: string }> = {
  pending: { tone: 'star', icon: CLOCK },
  approved: { tone: 'neutral', icon: ICONS.checkCircle },
  delivered: { tone: 'success', icon: ICONS.gift },
  rejected: { tone: 'danger', icon: ICONS.x },
}

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
  const [rejecting, setRejecting] = useState<RewardRequestView | null>(null)
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

  function confirmReject() {
    const q = rejecting
    if (!q) return
    setRejecting(null)
    run(`req:${q.id}`, () => rejectRequest(q.id))
  }

  return (
    <>
      <div className="clay-card flex flex-wrap items-center justify-between gap-3.5 bg-primary-soft px-6 py-5">
        <div className="max-w-[560px]">
          <div className="font-display text-[26px] font-extrabold text-primary-deep">Đổi sao lấy quà</div>
          <div className="text-[15.5px] font-semibold leading-normal text-muted">
            Học sinh gửi yêu cầu, hệ thống giữ trước sao và quà. Cô duyệt hoặc từ chối, sao chỉ bị trừ chính thức khi cô duyệt. Sao đổi quà không ảnh hưởng thứ hạng thi đua.
          </div>
        </div>
        <Button variant="accent" size="lg" onClick={() => open({ kind: 'new' })}>
          + Thêm phần thưởng
        </Button>
      </div>

      {editing && (editing.kind === 'new' || editingReward) && (
        <RewardEditor
          key={editing.kind === 'new' ? 'new' : editing.id}
          reward={editingReward}
          onClose={closeEditor}
        />
      )}

      {rewards.length === 0 ? (
        <EmptyState
          title="Chưa có phần thưởng nào"
          icon={ICONS.gift}
          action={<Button onClick={() => open({ kind: 'new' })}>+ Thêm phần thưởng</Button>}
        >
          Thêm món quà đầu tiên để học sinh có thể đổi bằng sao.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
          {rewards.map((w) => {
            const out = w.left <= 0
            const editingThis = editing?.kind === 'edit' && editing.id === w.id
            const hiddenKey = `hide:${w.id}`
            return (
              <div
                key={w.id}
                data-testid="reward-card"
                className={`clay-card flex flex-col gap-2.5 p-3.5 ${w.hidden ? 'opacity-60' : ''}`}
              >
                <RewardVisual visual={w.visual} iconSize={64} className="h-[120px] w-full rounded-panel" />
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 font-display text-[19px] font-extrabold leading-[1.2]">{w.name}</h3>
                  <Badge tone="star">
                    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                      <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" fill="#FFC857" stroke="#E0A020" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                    {w.cost}
                  </Badge>
                </div>
                <div className="text-sm font-semibold leading-[1.4] text-muted">{w.description}</div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={out ? 'danger' : 'success'}>
                      <Icon d={out ? ICONS.x : ICONS.check} size={14} />
                      {out ? 'Hết quà' : 'Còn quà'}
                    </Badge>
                    {w.hidden && (
                      <Badge>
                        <Icon d={ICONS.eyeOff} size={14} />
                        Đã ẩn
                      </Badge>
                    )}
                  </span>
                  <span className="text-[13px] font-bold text-muted">
                    {`Còn ${w.left}${w.held ? ` (đang giữ ${w.held})` : ''}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className={`flex-1 ${editingThis ? '!bg-primary-soft' : ''}`}
                    onClick={() => open({ kind: 'edit', id: w.id })}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    loading={busy.has(hiddenKey)}
                    onClick={() => run(hiddenKey, () => setRewardHidden(w.id, !w.hidden))}
                  >
                    {w.hidden ? 'Hiện' : 'Ẩn'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-2xl font-extrabold">Yêu cầu và lịch sử đổi quà</h2>
          <Badge tone={pendingCount > 0 ? 'star' : 'neutral'}>
            <Icon d={CLOCK} size={14} />
            {pendingCount} yêu cầu chờ duyệt
          </Badge>
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {requests.length === 0 && (
          <EmptyState title="Chưa có yêu cầu đổi quà nào" icon={ICONS.inbox}>
            Khi học sinh đổi quà, yêu cầu sẽ hiện ở đây để cô duyệt.
          </EmptyState>
        )}
        <div className="flex flex-col gap-2.5">
          {requests.map((q) => {
            const label = STAT[q.status][0]
            const badge = BADGE[q.status]
            const key = `req:${q.id}`
            const locked = busy.has(key)
            return (
              <div
                key={q.id}
                data-testid="request-row"
                className="grid grid-cols-1 items-center gap-2.5 rounded-2xl border-2 border-edge bg-bg px-3.5 py-3 md:grid-cols-[1.5fr_1.4fr_.7fr_1fr_1.8fr]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarImage avatar={q.avatar} size={44} />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-extrabold">{q.studentName}</span>
                    <span className="text-xs font-semibold text-muted">{formatRelative(new Date(q.createdAt), nowDate)}</span>
                  </div>
                </div>
                <div className="text-[15px] font-bold">{q.rewardName}</div>
                <div className="text-[15px] font-extrabold text-star-ink">{q.cost} sao</div>
                <div>
                  <Badge tone={badge.tone}>
                    <Icon d={badge.icon} size={14} />
                    {label}
                  </Badge>
                </div>
                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                  {q.status === 'pending' && (
                    <>
                      <Button loading={locked} onClick={() => run(key, () => approveRequest(q.id))}>
                        {!locked && <Icon d={ICONS.check} size={18} />}
                        Duyệt
                      </Button>
                      <Button variant="secondary" disabled={locked} onClick={() => setRejecting(q)}>
                        <Icon d={ICONS.x} size={18} />
                        Từ chối
                      </Button>
                    </>
                  )}
                  {q.status === 'approved' && (
                    <Button loading={locked} onClick={() => run(key, () => deliverRequest(q.id))}>
                      {!locked && <Icon d={ICONS.gift} size={18} />}
                      Đã trao quà
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <ConfirmDialog
        open={rejecting !== null}
        title="Từ chối yêu cầu này?"
        message={
          rejecting
            ? `Số sao và quà đã giữ sẽ được trả lại cho ${rejecting.studentName}. Việc này không hoàn tác được.`
            : ''
        }
        confirmLabel="Từ chối"
        cancelLabel="Giữ lại"
        danger
        onConfirm={confirmReject}
        onCancel={() => setRejecting(null)}
      />
    </>
  )
}
