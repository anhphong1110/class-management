import { useMemo, useState } from 'react'
import type { StarBatchView } from '@/lib/stars/history'

/** Ngữ cảnh để Hoàn tác ngay sau khi chấm: nhận ra lượt vừa tạo trong `batches` sau khi trang làm mới. */
export type UndoCtx = { key: number; knownIds: string[]; studentIds: string[]; points: number; isAdd: boolean }

export type UndoArm = Omit<UndoCtx, 'key'>

/**
 * Nhớ các lượt đã có trước khi chấm, rồi tìm lượt mới tương ứng trong `batches`.
 * `undo` được truyền vào (thực tế là hành động undoBatch bọc trong transition) để dễ kiểm thử.
 */
export function useUndoAward(batches: StarBatchView[], undo: (batchId: string) => void) {
  const [undoCtx, setUndoCtx] = useState<UndoCtx | null>(null)

  // Lượt vừa chấm: batch mới (chưa có trước khi gửi), cùng loại, cùng số sao, cùng nhóm bạn, chưa bị hoàn tác.
  const undoTarget = useMemo(() => {
    if (!undoCtx) return null
    const want = new Set(undoCtx.studentIds)
    return (
      batches.find(
        (b) =>
          !undoCtx.knownIds.includes(b.batchId) &&
          !b.reversed &&
          b.kind === (undoCtx.isAdd ? 'award' : 'penalty') &&
          Math.abs(b.delta) === undoCtx.points &&
          b.studentIds.length === want.size &&
          b.studentIds.every((id) => want.has(id)),
      ) ?? null
    )
  }, [undoCtx, batches])

  function arm(ctx: UndoArm) {
    setUndoCtx({ key: Date.now(), ...ctx })
  }

  function dismiss() {
    setUndoCtx(null)
  }

  /** Hoàn tác lượt vừa chấm bằng chính hành động hoàn tác của lịch sử (ghi thêm bản ghi đảo, không xóa bản cũ). */
  function undoLast() {
    if (!undoTarget) return
    const id = undoTarget.batchId
    setUndoCtx(null)
    undo(id)
  }

  return { undoCtx, undoTarget, arm, dismiss, undoLast }
}
