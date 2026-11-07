import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { MISSION_PERIOD_LABELS } from '@/lib/missions/period'
import { PAUSE, type Mission, type Student, type Undoing } from './shared'

export function MissionList({
  missions,
  studentCount,
  students,
  busy,
  noPerson,
  onDone,
  onToggle,
  onAskUndo,
}: {
  missions: Mission[]
  studentCount: number
  students: Student[]
  busy: boolean
  noPerson: boolean
  onDone: (m: Mission) => void
  onToggle: (id: string) => void
  onAskUndo: (u: Undoing) => void
}) {
  return (
    <>
      {missions.length === 0 && (
        <EmptyState title="Chưa có nhiệm vụ nào" icon={ICONS.star}>
          Tạo nhiệm vụ đầu tiên ở phía trên để cả lớp cùng thử sức nhé.
        </EmptyState>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))' }}>
        {missions.map((m) => (
          <div
            key={m.id}
            data-testid="mission-card"
            className="clay-card flex flex-col gap-2 p-5"
            style={{ opacity: m.active ? 1 : 0.55 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-display text-[19px] font-extrabold leading-tight">{m.name}</div>
              <Badge>{MISSION_PERIOD_LABELS[m.period]}</Badge>
            </div>
            <div className="text-[15px] font-semibold leading-[1.45] text-muted">{m.condition}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="star">
                <Icon d={ICONS.star} size={14} />
                {m.rewardStars > 0 ? `+${m.rewardStars} sao khi hoàn thành` : 'Chỉ trao huy hiệu'}
              </Badge>
              <Badge tone={m.active ? 'success' : 'neutral'}>
                <Icon d={m.active ? ICONS.checkCircle : PAUSE} size={14} />
                {m.active ? 'Đang mở' : 'Đã tạm dừng'}
              </Badge>
            </div>
            <div className="text-[13px] font-bold text-muted">
              {m.doneCount}/{studentCount} bạn đã hoàn thành
            </div>
            {m.completions.length > 0 && (
              <ul data-testid="completion-list" className="m-0 flex list-none flex-col gap-1.5 p-0">
                {m.completions.map((c) => {
                  const studentName = students.find((s) => s.id === c.studentId)?.fullName ?? ''
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-field py-1 pl-3 pr-1.5">
                      <span className="min-w-0 truncate text-sm font-bold">{studentName}</span>
                      <Button
                        variant="ghost"
                        aria-label={`Hoàn tác ${m.name} của ${studentName}`}
                        disabled={busy}
                        onClick={() => onAskUndo({ id: c.id, mission: m, studentName })}
                        className="shrink-0 !px-3 text-sm text-danger-deep hover:!bg-danger-soft hover:!text-danger-deep"
                      >
                        <Icon d={ICONS.undo} size={16} />
                        Hoàn tác
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <Button className="flex-1" onClick={() => onDone(m)} disabled={busy || noPerson || !m.active}>
                <Icon d={ICONS.check} size={18} />
                Ghi nhận thêm 1 bạn
              </Button>
              <Button variant="secondary" onClick={() => onToggle(m.id)} disabled={busy}>
                {m.active ? 'Tạm dừng' : 'Mở lại'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
