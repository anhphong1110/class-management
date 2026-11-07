import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import type { InfoValues } from '@/lib/settings/form'
import { card, h2, row } from './shared'

const INFO_FIELDS: [keyof InfoValues, string][] = [
  ['school_name', 'Tên trường'],
  ['class_name', 'Tên lớp'],
  ['brand_title', 'Tên trạm (chủ đề của lớp)'],
  ['school_year', 'Năm học'],
  ['teacher_name', 'Giáo viên chủ nhiệm'],
  ['slogan', 'Slogan'],
]
const TERM_FIELDS: [keyof InfoValues, string][] = [
  ['term1_start', 'Học kỳ 1 bắt đầu'],
  ['term1_end', 'Học kỳ 1 kết thúc'],
  ['term2_start', 'Học kỳ 2 bắt đầu'],
  ['term2_end', 'Học kỳ 2 kết thúc'],
]

export function ClassInfoSection({
  vals,
  setVals,
  saturdayOn,
  pending,
  onSaturday,
  onSave,
}: {
  vals: InfoValues
  setVals: (v: InfoValues) => void
  saturdayOn: boolean
  pending: boolean
  onSaturday: (next: boolean) => void
  onSave: () => void
}) {
  return (
    <section className={card} aria-labelledby="info-h">
      <h2 id="info-h" className={h2}>
        Thông tin lớp
      </h2>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {INFO_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}>
            {(a) => (
              <Input
                {...a}
                type="text"
                maxLength={k === 'brand_title' ? 60 : undefined}
                placeholder={k === 'brand_title' ? 'Để trống: tự lấy từ tên lớp, vd Trạm không gian Năm 8' : undefined}
                value={vals[k]}
                disabled={pending}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {TERM_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}>
            {(a) => (
              <Input
                {...a}
                type="date"
                value={vals[k]}
                disabled={pending}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>
      <p className="m-0 text-sm font-semibold text-muted">
        Mỗi năm học cô cập nhật ngày học kỳ để bảng xếp hạng và nhiệm vụ theo học kỳ tính đúng.
      </p>
      <div className={row}>
        <Switch checked={saturdayOn} onChange={onSaturday} label="Lớp học thứ Bảy" disabled={pending} />
      </div>
      <div>
        <Button size="lg" onClick={onSave} loading={pending}>
          Lưu thông tin
        </Button>
      </div>
    </section>
  )
}
