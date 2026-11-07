import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import type { Badge, Note } from './shared'

export function BadgeSection({
  badges,
  msg,
  badgeNote,
  studentSelect,
  personId,
  busy,
  noPerson,
  onGive,
  onAskRevoke,
}: {
  badges: Badge[]
  msg: string
  badgeNote: Note
  studentSelect: ReactNode
  personId: string | null
  busy: boolean
  noPerson: boolean
  onGive: (b: Badge) => void
  onAskRevoke: (b: Badge) => void
}) {
  return (
    <Card className="flex flex-col gap-3.5">
      <h2 className="m-0 font-display text-[22px] font-extrabold">Huy hiệu</h2>
      {msg ? <Notice tone="success">{msg}</Notice> : null}
      {badgeNote ? <Notice tone={badgeNote.tone}>{badgeNote.text}</Notice> : null}
      <div className="flex flex-wrap items-center gap-2.5 text-[15px] font-extrabold text-ink">
        <label className="flex items-center gap-2">
          Trao cho
          {studentSelect}
        </label>
        <span className="text-sm font-semibold text-muted">
          rồi bấm &quot;Trao huy hiệu&quot; ở huy hiệu muốn trao.
        </span>
      </div>
      {badges.length === 0 && (
        <EmptyState title="Chưa có huy hiệu nào" icon={ICONS.trophy}>
          Huy hiệu của lớp sẽ hiện ở đây.
        </EmptyState>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        {badges.map((b) => (
          <div
            key={b.id}
            data-testid="badge-card"
            className="flex flex-col items-center gap-1.5 rounded-panel border-2 border-edge bg-field p-4 text-center"
          >
            <div
              className="flex h-[68px] w-[68px] items-center justify-center rounded-full"
              style={{ background: b.gradient }}
            >
              <svg
                viewBox="0 0 24 24"
                width="34"
                height="34"
                fill="rgba(255,255,255,.3)"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={b.icon} />
              </svg>
            </div>
            <div className="text-[15px] font-extrabold leading-tight">{b.name}</div>
            <div className="text-[13px] font-bold text-muted">{b.count} bạn đã đạt</div>
            <Button variant="secondary" className="w-full" onClick={() => onGive(b)} disabled={busy || noPerson}>
              Trao huy hiệu
            </Button>
            <Button
              variant="ghost"
              className="w-full text-danger-deep hover:!bg-danger-soft hover:!text-danger-deep"
              onClick={() => onAskRevoke(b)}
              disabled={busy || noPerson || !personId || !b.holderIds.includes(personId)}
            >
              Thu hồi
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
