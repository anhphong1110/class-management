'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { createStudent, updateStudent } from './actions'

export type EditTarget = { id: string; fullName: string; rollNo: number }

/** Thêm mới khi `student` là null, sửa khi có. */
export function StudentForm({ open, student, onClose }: { open: boolean; student: EditTarget | null; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={student ? 'Sửa thông tin học sinh' : 'Thêm học sinh'}>
      {/* key: dựng lại form mỗi lần mở để không giữ giá trị cũ */}
      <FormBody key={student?.id ?? 'new'} student={student} onClose={onClose} />
    </Modal>
  )
}

function FormBody({ student, onClose }: { student: EditTarget | null; onClose: () => void }) {
  const [fullName, setFullName] = useState(student?.fullName ?? '')
  const [roll, setRoll] = useState(student ? String(student.rollNo) : '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const rollText = roll.trim()
    const rollNo = rollText === '' ? null : Number(rollText)
    if (rollNo !== null && !Number.isInteger(rollNo)) {
      setError('Số thứ tự phải là số nguyên dương.')
      return
    }
    startTransition(async () => {
      const res = student
        ? await updateStudent({ id: student.id, fullName, rollNo: rollNo ?? student.rollNo })
        : await createStudent({ fullName, rollNo })
      if (res.error) setError(res.error)
      else onClose()
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Họ và tên">
        {(f) => <Input {...f} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} autoComplete="off" />}
      </Field>
      <Field label="Số thứ tự">
        {(f) => (
          <Input
            {...f}
            inputMode="numeric"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder={student ? undefined : 'Để trống để tự điền số tiếp theo'}
            autoComplete="off"
          />
        )}
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </div>
    </form>
  )
}
