'use client'

import { useState, useTransition } from 'react'
import { changeMyPassword } from '@/app/em/actions'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { toVietnameseMessage } from '@/lib/errors'

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setPassword('')
    setConfirm('')
    setError(null)
    setDone(false)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await changeMyPassword(password, confirm)
        if (res.error) setError(res.error)
        else setDone(true)
      } catch {
        setError(toVietnameseMessage('unknown'))
      }
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="!min-h-11 !px-4 text-sm">
        Đổi mật khẩu
      </Button>
      <Modal open={open} onClose={close} title="Đổi mật khẩu">
        {done ? (
          <div className="flex flex-col gap-3">
            <Notice tone="success">Đã đổi mật khẩu. Lần sau em đăng nhập bằng mật khẩu mới nhé.</Notice>
            <div className="flex justify-end">
              <Button onClick={close}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <Field label="Mật khẩu mới">
              {(a) => (
                <Input
                  {...a}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  maxLength={72}
                />
              )}
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              {(a) => (
                <Input
                  {...a}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  maxLength={72}
                />
              )}
            </Field>
            <p className="m-0 text-[13px] text-muted">Ít nhất 6 ký tự. Em nhớ ghi lại để lần sau đăng nhập nhé.</p>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={close} disabled={pending}>
                Hủy
              </Button>
              <Button type="submit" loading={pending}>
                Lưu
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
