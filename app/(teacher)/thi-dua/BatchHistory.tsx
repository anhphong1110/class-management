import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { joinNames } from '@/lib/domain/names'
import { formatRelative } from '@/lib/domain/relative-time'
import type { StarBatchView } from '@/lib/stars/history'
import { card, h2, signed } from './helpers'

export function BatchHistory({
  batches,
  now,
  pending,
  onUndo,
}: {
  batches: StarBatchView[]
  now: Date
  pending: boolean
  onUndo: (b: StarBatchView) => void
}) {
  return (
    <section data-testid="history" className={`${card} flex min-w-0 flex-[1_1_420px] flex-col gap-3 !p-6`}>
      <h2 className={h2}>Lịch sử giao dịch sao</h2>
      <div className="text-[13.5px] font-semibold text-muted">Hoàn tác sẽ tạo thêm một bản ghi mới, không xóa bản ghi cũ.</div>
      {batches.map((b) => {
        const isReversal = b.kind === 'reversal'
        const done = isReversal || b.reversed
        const positive = b.delta > 0
        return (
          <div key={b.batchId} data-testid="history-row" className="flex items-center gap-3 rounded-2xl bg-bg px-3.5 py-2.5">
            <div
              className={`min-w-[46px] shrink-0 rounded-xl px-2 py-1.5 text-center font-extrabold ${
                positive ? 'bg-star-soft text-star-ink' : 'bg-danger-soft text-danger-deep'
              }`}
            >
              {signed(b.delta)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-extrabold">{joinNames(b.studentNames)}</div>
              <div className="text-[13px] font-semibold text-muted">
                {b.reason} · {formatRelative(new Date(b.at), now)} · {b.actorName}
              </div>
            </div>
            <Button variant="secondary" disabled={done || pending} onClick={() => onUndo(b)} className="!px-3 text-[13px]">
              {!done ? <Icon d={ICONS.undo} size={16} /> : null}
              {isReversal ? 'Đã ghi' : b.reversed ? 'Đã hoàn tác' : 'Hoàn tác'}
            </Button>
          </div>
        )
      })}
      {batches.length === 0 && (
        <EmptyState title="Chưa có giao dịch nào" icon={ICONS.star}>
          Cô chọn học sinh rồi cộng hoặc trừ sao, lịch sử sẽ hiện ở đây.
        </EmptyState>
      )}
    </section>
  )
}
