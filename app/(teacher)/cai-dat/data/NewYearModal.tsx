import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { COPY_OPTIONS, type CopyKey } from '@/lib/backup/year'

const NEW_YEAR_NOTE =
  'Năm học hiện tại được lưu trữ và năm mới bắt đầu từ 0 sao. Học sinh không được chép sang; các yêu cầu đổi quà đang chờ sẽ bị từ chối và sao được trả lại.'

export type YearForm = { schoolYear: string; className: string; teacherName: string }

export function NewYearModal({
  open,
  onClose,
  onSubmit,
  pending,
  form,
  setForm,
  copy,
  onToggleCopy,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  pending: boolean
  form: YearForm
  setForm: Dispatch<SetStateAction<YearForm>>
  copy: CopyKey[]
  onToggleCopy: (key: CopyKey, on: boolean) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Mở năm học mới">
      <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
        <Field label="Năm học">
          {(a) => (
            <Input
              {...a}
              value={form.schoolYear}
              onChange={(e) => setForm((f) => ({ ...f, schoolYear: e.target.value }))}
              disabled={pending}
              required
              maxLength={100}
            />
          )}
        </Field>
        <Field label="Tên lớp">
          {(a) => (
            <Input
              {...a}
              value={form.className}
              onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
              disabled={pending}
              required
              maxLength={100}
            />
          )}
        </Field>
        <Field label="Giáo viên chủ nhiệm">
          {(a) => (
            <Input
              {...a}
              value={form.teacherName}
              onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))}
              disabled={pending}
              maxLength={100}
            />
          )}
        </Field>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1 p-0 text-[15px] font-extrabold text-ink">Chép sang năm mới</legend>
          {COPY_OPTIONS.map((o) => (
            <label key={o.key} className="flex min-h-11 items-center gap-2.5 text-[15px] font-bold">
              <input
                type="checkbox"
                className="size-5 accent-primary-strong"
                checked={copy.includes(o.key)}
                disabled={pending || (o.key === 'timetable' && !copy.includes('subjects'))}
                onChange={(e) => onToggleCopy(o.key, e.target.checked)}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
        <p className="m-0 text-sm font-semibold text-muted">{NEW_YEAR_NOTE}</p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" loading={pending} disabled={!form.schoolYear.trim() || !form.className.trim()}>
            Lưu trữ và mở năm mới
          </Button>
        </div>
      </form>
    </Modal>
  )
}
