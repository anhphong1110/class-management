'use client'

import { useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
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

  if (!enabled) {
    return (
      <div className="rounded-full border-4 border-white bg-white shadow-[0_4px_0_var(--primary-edge)]">
        <AvatarImage avatar={current} size={130} />
      </div>
    )
  }

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
        className="group flex cursor-pointer flex-col items-center gap-2 rounded-[20px] border-0 bg-transparent p-1"
      >
        <span className="rounded-full border-4 border-white bg-white shadow-[0_4px_0_var(--primary-edge)] transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <AvatarImage avatar={current} size={130} />
        </span>
        <span className="inline-flex min-h-11 items-center rounded-full border-2 border-primary-strong bg-white px-4 text-base font-extrabold text-primary-strong group-hover:bg-primary-soft">
          Đổi avatar
        </span>
      </button>
      <Modal open={open} onClose={close} title="Chọn avatar của em">
        <div className="flex flex-col gap-4">
          {error && <Notice tone="error">{error}</Notice>}
          <div className="max-h-[52vh] overflow-y-auto p-1">
            <div role="radiogroup" aria-label="Thư viện avatar" className="grid grid-cols-3 gap-3 min-[420px]:grid-cols-4">
              {library.map((a) => {
                const on = picked === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={a.label || 'Avatar'}
                    disabled={pending}
                    onClick={() => setPicked(a.id)}
                    className={`relative flex min-h-[84px] cursor-pointer items-center justify-center rounded-[20px] border-2 p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      on ? 'border-primary-strong bg-primary-soft shadow-[0_3px_0_var(--primary-deep)]' : 'border-edge bg-white hover:bg-primary-soft'
                    }`}
                  >
                    <AvatarImage avatar={a.avatar} size={64} />
                    {on && (
                      <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-primary-strong text-white">
                        <Icon d={ICONS.check} size={16} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {!pending && picked === currentId && <p className="m-0 text-base font-semibold text-muted">Chọn một avatar mới rồi bấm Lưu avatar nhé.</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close} disabled={pending}>
              Hủy
            </Button>
            <Button size="lg" onClick={save} disabled={pending || !picked || picked === currentId}>
              {pending ? 'Đang lưu…' : 'Lưu avatar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
