import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Badge, Undoing } from './shared'

export function MissionDialogs({
  undoing,
  revoking,
  personName,
  busy,
  onCancelUndo,
  onConfirmUndo,
  onCancelRevoke,
  onConfirmRevoke,
}: {
  undoing: Undoing | null
  revoking: Badge | null
  personName: string
  busy: boolean
  onCancelUndo: () => void
  onConfirmUndo: (u: Undoing) => void
  onCancelRevoke: () => void
  onConfirmRevoke: (b: Badge) => void
}) {
  return (
    <>
      <ConfirmDialog
        open={undoing !== null}
        title="Hoàn tác nhiệm vụ"
        message={
          undoing
            ? `Cô muốn hoàn tác việc ghi nhận "${undoing.mission.name}" cho ${undoing.studentName}?${undoing.mission.rewardStars > 0 ? ` Số sao thưởng (${undoing.mission.rewardStars}) sẽ được trừ lại.` : ''}`
            : ''
        }
        confirmLabel="Đồng ý hoàn tác"
        cancelLabel="Hủy"
        danger
        pending={busy}
        onCancel={onCancelUndo}
        onConfirm={() => undoing && onConfirmUndo(undoing)}
      />

      <ConfirmDialog
        open={revoking !== null}
        title="Thu hồi huy hiệu"
        message={revoking ? `Cô muốn thu hồi huy hiệu "${revoking.name}" của ${personName}?` : ''}
        confirmLabel="Đồng ý thu hồi"
        cancelLabel="Hủy"
        danger
        pending={busy}
        onCancel={onCancelRevoke}
        onConfirm={() => revoking && onConfirmRevoke(revoking)}
      />
    </>
  )
}
