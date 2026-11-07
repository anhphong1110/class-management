import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import type { StarGroup, StudentWithStars } from '@/lib/stars/queries'
import { card, chip, h2 } from './helpers'

export function StudentPicker({
  students,
  groups,
  sel,
  selectedCount,
  onSelectAll,
  onClear,
  onToggleStudent,
  onToggleGroup,
}: {
  students: StudentWithStars[]
  groups: StarGroup[]
  sel: Set<string>
  selectedCount: number
  onSelectAll: () => void
  onClear: () => void
  onToggleStudent: (id: string) => void
  onToggleGroup: (g: StarGroup) => void
}) {
  const byId = new Map(students.map((s) => [s.id, s]))
  return (
    <section className={`${card} flex flex-col gap-3.5`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className={h2}>
          1. Chọn học sinh{' '}
          <span className="font-body text-[15px] font-bold text-muted">(đã chọn {selectedCount})</span>
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={onSelectAll}>
            Chọn cả lớp
          </Button>
          <Button variant="secondary" onClick={onClear}>
            Bỏ chọn
          </Button>
        </div>
      </div>
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14.5px] font-extrabold text-muted">Chọn cả tổ:</span>
          {groups.map((g) => {
            const ids = g.memberIds.filter((id) => byId.has(id))
            const on = ids.length > 0 && ids.every((id) => sel.has(id))
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleGroup(g)}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-[14.5px] font-extrabold transition-colors ${chip(on)}`}
              >
                {on ? <Icon d={ICONS.check} size={16} /> : null}
                {g.name} ({ids.length} bạn)
              </button>
            )
          })}
        </div>
      )}
      {students.length === 0 ? (
        <EmptyState title="Lớp chưa có học sinh" icon={ICONS.users}>
          Cô thêm học sinh ở trang Quản lý học sinh rồi quay lại chấm sao nhé.
        </EmptyState>
      ) : null}
      <div data-testid="students" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
        {students.map((s) => {
          const on = sel.has(s.id)
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggleStudent(s.id)}
              className={`relative flex min-h-16 cursor-pointer items-center gap-2.5 rounded-panel border-2 px-3 py-2.5 text-left text-ink transition-colors ${
                on ? 'border-primary-strong bg-primary-soft' : 'border-edge bg-white hover:bg-bg'
              }`}
            >
              <AvatarImage avatar={s.avatar} size={46} />
              <span className="flex min-w-0 flex-col">
                <span className="text-[14.5px] font-extrabold leading-[1.2]">{s.fullName}</span>
                <span className="text-[12.5px] font-bold text-muted">{s.available} sao khả dụng</span>
              </span>
              {on ? (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary-strong text-white">
                  <Icon d={ICONS.check} size={13} />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
