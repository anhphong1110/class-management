import { StarBurst } from '@/components/stars/StarBurst'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import type { StarCriterion } from '@/lib/stars/queries'
import { card, chip, h2, type Mode } from './helpers'

export function ActionPanel({
  mode,
  amountList,
  amount,
  custom,
  amt,
  critList,
  critId,
  note,
  err,
  msg,
  selectedCount,
  pending,
  flash,
  onMode,
  onAmount,
  onCustom,
  onPickCriterion,
  onNote,
  onSubmit,
}: {
  mode: Mode
  amountList: number[]
  amount: number
  custom: string
  amt: number
  critList: StarCriterion[]
  critId: string | null
  note: string
  err: string
  msg: string
  selectedCount: number
  pending: boolean
  flash: number
  onMode: (m: Mode) => void
  onAmount: (v: number) => void
  onCustom: (raw: string) => void
  onPickCriterion: (c: StarCriterion) => void
  onNote: (v: string) => void
  onSubmit: () => void
}) {
  const isAdd = mode === 'add'
  const onAmountCls = isAdd ? 'border-star-edge bg-star text-star-ink' : 'border-danger bg-danger text-white'
  return (
    <section className={`${card} relative flex flex-col gap-[18px]`}>
      <h2 className={h2}>2. Chọn thao tác và lý do</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          aria-pressed={isAdd}
          onClick={() => onMode('add')}
          className={`inline-flex min-h-16 flex-[1_1_180px] cursor-pointer items-center justify-center gap-2 rounded-panel border-2 text-xl font-extrabold transition-colors ${
            isAdd ? 'border-star-edge bg-star text-star-ink shadow-[0_4px_0_var(--color-star-edge)]' : 'border-edge bg-white text-ink hover:bg-primary-soft'
          }`}
        >
          {isAdd ? <Icon d={ICONS.check} size={22} /> : null}+ Cộng sao
        </button>
        <button
          type="button"
          aria-pressed={!isAdd}
          onClick={() => onMode('sub')}
          className={`inline-flex min-h-16 flex-[1_1_180px] cursor-pointer items-center justify-center gap-2 rounded-panel border-2 text-xl font-extrabold transition-colors ${
            !isAdd ? 'border-danger bg-danger text-white shadow-[0_4px_0_var(--color-danger-deep)]' : 'border-edge bg-white text-ink hover:bg-primary-soft'
          }`}
        >
          {!isAdd ? <Icon d={ICONS.check} size={22} /> : null}− Trừ sao
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[15px] font-extrabold text-ink">Số sao</div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div data-testid="amounts" className="contents">
            {amountList.map((v) => {
              const on = custom === '' && amount === v
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onAmount(v)}
                  className={`min-h-14 min-w-[72px] cursor-pointer rounded-ctl border-2 px-4 text-xl font-extrabold transition-colors ${
                    on ? onAmountCls : 'border-edge bg-white text-ink hover:bg-primary-soft'
                  }`}
                >
                  {isAdd ? '+' : '−'}
                  {v}
                </button>
              )
            })}
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-muted">
            Tùy chỉnh
            <Input
              type="number"
              min={1}
              max={100}
              value={custom}
              placeholder="Số khác"
              onChange={(e) => onCustom(e.target.value)}
              className="!min-h-14 !w-[120px] text-lg"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[15px] font-extrabold text-ink">Tiêu chí</div>
        {critList.length === 0 ? (
          <p className="m-0 text-sm font-semibold text-muted">
            Chưa có tiêu chí {isAdd ? 'cộng' : 'trừ'} sao. Cô thêm ở khung Quản lý tiêu chí bên dưới, hoặc ghi lý do vào ô ghi chú.
          </p>
        ) : null}
        <div data-testid="criteria-picker" className="flex flex-wrap gap-2">
          {critList.map((c) => {
            const on = c.id === critId
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => onPickCriterion(c)}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-3.5 text-[14.5px] font-bold transition-colors ${chip(on)}`}
              >
                {on ? <Icon d={ICONS.check} size={16} /> : null}
                {c.label} <b>{isAdd ? '+' : '−'}{c.defaultPoints}</b>
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Ghi chú / lý do khác">
        {(f) => (
          <Input
            {...f}
            type="text"
            value={note}
            maxLength={200}
            placeholder="Cô nhập thêm lý do nếu cần"
            onChange={(e) => onNote(e.target.value)}
          />
        )}
      </Field>

      {err && <Notice tone="error">{err}</Notice>}
      {msg && <Notice tone="success">{msg}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[15px] font-bold text-muted">
          {selectedCount
            ? `${isAdd ? 'Cộng' : 'Trừ'} ${amt} sao cho ${selectedCount} học sinh`
            : 'Chưa chọn học sinh'}
        </div>
        <Button size="lg" variant={isAdd ? 'accent' : 'danger'} onClick={onSubmit} disabled={pending} className="!px-8 !text-xl">
          {isAdd ? 'Xác nhận cộng sao' : 'Xác nhận trừ sao'}
        </Button>
      </div>
      <StarBurst playKey={flash} />
    </section>
  )
}
