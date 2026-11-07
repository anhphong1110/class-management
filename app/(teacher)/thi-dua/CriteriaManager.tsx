import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import type { StarCriterion } from '@/lib/stars/queries'
import { card, h2, PENCIL } from './helpers'

export function CriteriaManager({
  manageList,
  onAdd,
  onEdit,
  onArchive,
}: {
  manageList: StarCriterion[]
  onAdd: () => void
  onEdit: (c: StarCriterion) => void
  onArchive: (c: StarCriterion) => void
}) {
  return (
    <section data-testid="manage" className={`${card} flex min-w-0 flex-[1_1_320px] flex-col gap-3 !p-6`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={h2}>Quản lý tiêu chí</h2>
        <Button onClick={onAdd}>+ Thêm tiêu chí</Button>
      </div>
      <div className="text-[13.5px] font-semibold text-muted">Cô có thể sửa tên, số sao mặc định hoặc lưu trữ từng tiêu chí.</div>
      {manageList.map((c) => (
        <div key={c.id} className="flex items-center gap-2.5 rounded-ctl bg-bg px-3 py-2">
          <span
            className={`min-w-9 shrink-0 rounded-chip px-2 py-1 text-center text-[13px] font-extrabold ${
              c.kind === 'award' ? 'bg-star-soft text-star-ink' : 'bg-danger-soft text-danger-deep'
            }`}
          >
            {c.kind === 'award' ? '+' : '−'}
            {c.defaultPoints}
          </span>
          <span className="min-w-0 flex-1 text-[14.5px] font-bold">{c.label}</span>
          <button
            type="button"
            aria-label={`Sửa tiêu chí ${c.label}`}
            onClick={() => onEdit(c)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-primary-ink hover:bg-primary-soft"
          >
            <Icon d={PENCIL} size={19} />
          </button>
          <button
            type="button"
            aria-label={`Lưu trữ tiêu chí ${c.label}`}
            onClick={() => onArchive(c)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-danger-deep hover:bg-danger-soft"
          >
            <Icon d={ICONS.trash} size={19} />
          </button>
        </div>
      ))}
      {manageList.length === 0 && (
        <EmptyState title="Chưa có tiêu chí nào" icon={ICONS.plus}>
          Thêm tiêu chí để chấm sao nhanh hơn, ví dụ &quot;Giúp đỡ bạn bè&quot;.
        </EmptyState>
      )}
    </section>
  )
}
