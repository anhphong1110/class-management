'use client'

import { useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { saveMyAvatar } from './actions'

export type PickerItem = { id: string; label: string; avatar: AvatarValue }

/** Avatar ở trang chủ; khi cô bật quyền, bấm vào để chọn avatar khác trong thư viện của lớp. */
export function AvatarPicker({
  current,
  currentId,
  library,
  enabled,
}: {
  current: AvatarValue
  currentId: string | null
  library: PickerItem[]
  enabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(currentId)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!enabled) return <AvatarImage avatar={current} size={130} />

  function close() {
    if (pending) return
    setOpen(false)
    setError(null)
    setPicked(currentId)
  }

  function save() {
    if (!picked) return
    startTransition(async () => {
      const res = await saveMyAvatar(picked)
      if (res.error) setError(res.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        aria-label="Đổi avatar"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <AvatarImage avatar={current} size={130} />
      </button>
      <Modal open={open} onClose={close} title="Chọn avatar của em">
        <div className="flex flex-col gap-4">
          {error && <Notice tone="error">{error}</Notice>}
          <div role="radiogroup" aria-label="Thư viện avatar" className="grid grid-cols-4 gap-3">
            {library.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={picked === a.id}
                aria-label={a.label || 'Avatar'}
                disabled={pending}
                onClick={() => setPicked(a.id)}
                className={`flex cursor-pointer items-center justify-center rounded-2xl border-2 bg-white p-1.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  picked === a.id ? 'border-primary-strong bg-primary-soft' : 'border-transparent'
                }`}
              >
                <AvatarImage avatar={a.avatar} size={56} />
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={close} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={save} disabled={pending || !picked || picked === currentId}>
              {pending ? 'Đang lưu…' : 'Lưu avatar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
