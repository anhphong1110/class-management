'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { createStudent, updateStudent } from './actions'

export type EditTarget = { id: string; fullName: string; rollNo: number }

const input = 'min-h-12 w-full rounded-[14px] border-2 border-[#D9D5F2] bg-white px-3.5 text-base font-semibold text-ink'

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
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5 text-sm font-bold text-[#4A476E]">
        Họ và tên
        <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-[#4A476E]">
        Số thứ tự
        <input
          className={input}
          inputMode="numeric"
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          placeholder={student ? undefined : 'Để trống để tự điền số tiếp theo'}
          autoComplete="off"
        />
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          Lưu
        </Button>
      </div>
    </form>
  )
}
