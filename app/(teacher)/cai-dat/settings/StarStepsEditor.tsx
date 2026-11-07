import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'

export function StarStepsEditor({
  steps,
  adding,
  stepText,
  pending,
  onRemove,
  onStartAdd,
  onCancelAdd,
  onTextChange,
  onConfirm,
}: {
  steps: number[]
  adding: boolean
  stepText: string
  pending: boolean
  onRemove: (n: number) => void
  onStartAdd: () => void
  onCancelAdd: () => void
  onTextChange: (text: string) => void
  onConfirm: () => void
}) {
  return (
    <>
      <div className="text-[15px] font-extrabold text-ink">Mức sao gợi ý (cộng)</div>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            aria-label={`Xóa mức +${n}`}
            onClick={() => onRemove(n)}
            className="inline-flex min-h-11 min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-star-edge bg-star-soft px-3 text-[15px] font-extrabold text-star-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>+{n}</span>
            <Icon d={ICONS.x} size={14} />
          </button>
        ))}
        {adding ? (
          <span className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              aria-label="Mức sao mới"
              value={stepText}
              autoFocus
              disabled={pending}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm()
                if (e.key === 'Escape') onCancelAdd()
              }}
              className="!w-[96px]"
            />
            <Button onClick={onConfirm} disabled={pending}>
              Thêm
            </Button>
          </span>
        ) : (
          <Button variant="secondary" className="border-dashed" disabled={pending} onClick={onStartAdd}>
            + Thêm mức
          </Button>
        )}
      </div>
    </>
  )
}
