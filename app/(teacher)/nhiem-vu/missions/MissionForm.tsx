import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { MISSION_PERIODS, MISSION_PERIOD_LABELS, type MissionPeriod } from '@/lib/missions/period'

export function MissionForm({
  name,
  setName,
  condition,
  setCondition,
  rewardStars,
  setRewardStars,
  period,
  setPeriod,
  busy,
  formErr,
  clearFormErr,
  onAdd,
}: {
  name: string
  setName: (v: string) => void
  condition: string
  setCondition: (v: string) => void
  rewardStars: number
  setRewardStars: (v: number) => void
  period: MissionPeriod
  setPeriod: (v: MissionPeriod) => void
  busy: boolean
  formErr: string
  clearFormErr: () => void
  onAdd: () => void
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="m-0 font-display text-[22px] font-extrabold">Tạo nhiệm vụ mới</h2>
      <fieldset className="m-0 flex flex-col gap-3 rounded-ctl border-2 border-edge px-4 pb-4 pt-2">
        <legend className="px-2 text-sm font-extrabold text-primary-deep">Nội dung nhiệm vụ</legend>
        <div className="flex flex-wrap gap-3">
          <Field label="Tên nhiệm vụ" className="flex-[2_1_240px]">
            {(a) => (
              <Input
                {...a}
                type="text"
                value={name}
                disabled={busy}
                maxLength={120}
                onChange={(e) => {
                  setName(e.target.value)
                  clearFormErr()
                }}
                placeholder="Ví dụ: Đọc 2 cuốn sách trong tuần"
              />
            )}
          </Field>
          <Field label="Thời gian" className="flex-[1_1_150px]">
            {(a) => (
              <Select {...a} value={period} disabled={busy} onChange={(e) => setPeriod(e.target.value as MissionPeriod)}>
                {MISSION_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {MISSION_PERIOD_LABELS[p]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Điều kiện hoàn thành">
          {(a) => (
            <Input
              {...a}
              type="text"
              value={condition}
              disabled={busy}
              maxLength={300}
              onChange={(e) => {
                setCondition(e.target.value)
                clearFormErr()
              }}
              placeholder="Ví dụ: Cô xác nhận sau khi em kể lại nội dung"
            />
          )}
        </Field>
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-3 rounded-ctl border-2 border-edge px-4 pb-4 pt-2">
        <legend className="px-2 text-sm font-extrabold text-primary-deep">Phần thưởng</legend>
        <Field
          label="Thưởng (sao)"
          hint="Nhiệm vụ không tự cộng sao, trừ khi cô nhập số sao thưởng (để 0 nếu chỉ trao huy hiệu)."
          className="max-w-[360px]"
        >
          {(a) => (
            <Input
              {...a}
              type="number"
              min={0}
              max={100}
              value={rewardStars}
              disabled={busy}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setRewardStars(v >= 0 ? Math.min(v, 100) : 0)
              }}
            />
          )}
        </Field>
      </fieldset>
      <div className="flex justify-end">
        <Button size="lg" onClick={onAdd} loading={busy}>
          + Thêm nhiệm vụ
        </Button>
      </div>
      {formErr ? <Notice tone="error">{formErr}</Notice> : null}
    </Card>
  )
}
