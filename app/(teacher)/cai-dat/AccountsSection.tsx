'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { toVietnameseMessage } from '@/lib/errors'
import type { AccountRow } from '@/lib/accounts/queries'
import { createStudentAccounts, setStudentLogin, setStudentPasswords } from './accounts-actions'

type Failed = { name: string; reason: string }

const input = 'min-h-12 w-full rounded-[14px] border-2 border-[#D9D5F2] bg-white px-3.5 text-base font-semibold text-ink'

const card =
  'flex flex-col gap-3.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'

const checkbox = 'size-5 flex-none cursor-pointer accent-primary-strong'

export function AccountsSection({ accounts }: { accounts: AccountRow[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [failed, setFailed] = useState<Failed[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [dialogError, setDialogError] = useState<string | null>(null)

  const missing = accounts.filter((a) => a.username === null).length
  const withAccount = accounts.filter((a) => a.username !== null)
  const count = selected.size
  const allSelected = withAccount.length > 0 && withAccount.every((a) => selected.has(a.studentId))

  const unknown = () => setError(toVietnameseMessage('unknown'))

  function toggle(studentId: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(studentId)
      else next.delete(studentId)
      return next
    })
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(withAccount.map((a) => a.studentId)) : new Set())
  }

  function createAll() {
    setError(null)
    setInfo(null)
    setFailed([])
    startTransition(async () => {
      try {
        const res = await createStudentAccounts()
        setFailed(res.failed)
        if (res.created.length > 0) {
          // Chọn sẵn các bạn vừa có tài khoản để cô đặt mật khẩu ngay.
          setSelected(new Set(res.created.map((c) => c.studentId)))
          setInfo(`Đã tạo ${res.created.length} tài khoản. Cô bấm "Đặt mật khẩu" để cho các bạn đăng nhập nhé.`)
        } else if (res.failed.length === 0) {
          setInfo('Tất cả học sinh đã có tài khoản.')
        }
      } catch {
        unknown()
      }
    })
  }

  function closeDialog() {
    setDialogOpen(false)
    setPassword('')
    setDialogError(null)
  }

  function savePasswords() {
    setDialogError(null)
    startTransition(async () => {
      try {
        const res = await setStudentPasswords([...selected], password)
        if ('error' in res) {
          setDialogError(res.error)
          return
        }
        closeDialog()
        setFailed([])
        setInfo(`Đã đặt mật khẩu cho ${res.updated} bạn.`)
        if (res.failed.length > 0) setError(`Chưa đặt được cho: ${res.failed.join(', ')}. Cô thử lại nhé.`)
        else setError(null)
      } catch {
        setDialogError(toVietnameseMessage('unknown'))
      }
    })
  }

  function setLogin(studentId: string, enabled: boolean) {
    setError(null)
    setInfo(null)
    startTransition(async () => {
      try {
        const res = await setStudentLogin(studentId, enabled)
        if (res.error) setError(res.error)
      } catch {
        unknown()
      }
    })
  }

  return (
    <section className={card} aria-labelledby="acc-h">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id="acc-h" className="m-0 font-display text-[22px] font-extrabold">
          Tài khoản học sinh
        </h2>
        <Button onClick={createAll} disabled={pending || missing === 0}>
          Tạo tài khoản hàng loạt
        </Button>
      </div>
      <p className="m-0 text-[13.5px] text-muted">
        Tạo tài khoản xong, cô chọn các bạn rồi đặt một mật khẩu chung. Các bạn đăng nhập rồi tự đổi mật khẩu của mình. Cô không xem lại được mật khẩu
        của học sinh, chỉ đặt mật khẩu mới.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="success">{info}</Notice>}
      {failed.length > 0 && (
        <Notice tone="error">
          <div className="font-extrabold">Chưa tạo được:</div>
          <ul className="m-0 pl-5 text-sm">
            {failed.map((f) => (
              <li key={f.name}>
                {f.name}: {f.reason}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-extrabold text-[#4A476E]">
          <input
            type="checkbox"
            className={checkbox}
            checked={allSelected}
            disabled={withAccount.length === 0}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          Chọn tất cả
        </label>
        <Button variant="secondary" onClick={() => setDialogOpen(true)} disabled={pending || count === 0}>
          {count === 0 ? 'Đặt mật khẩu cho bạn đã chọn' : `Đặt mật khẩu cho ${count} bạn đã chọn`}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <ul className="m-0 flex min-w-[560px] list-none flex-col gap-2 p-0">
          {accounts.map((a) => (
            <li
              key={a.studentId}
              aria-label={a.name}
              className="grid items-center gap-2.5 rounded-[14px] bg-[#F6F4FF] px-3.5 py-1.5 [grid-template-columns:auto_1.6fr_1.3fr_1.2fr]"
            >
              {a.username === null ? (
                <span className="size-5" aria-hidden="true" />
              ) : (
                <input
                  type="checkbox"
                  className={checkbox}
                  aria-label={`Chọn ${a.name}`}
                  checked={selected.has(a.studentId)}
                  onChange={(e) => toggle(a.studentId, e.target.checked)}
                />
              )}
              <div className="text-[15px] font-extrabold">{a.name}</div>
              <div className="text-sm font-bold text-[#4A476E]">{a.username ?? ''}</div>
              {a.username === null ? (
                <div className="text-sm font-bold text-muted">Chưa có tài khoản</div>
              ) : (
                <Switch
                  checked={!a.loginDisabled}
                  onChange={(next) => setLogin(a.studentId, next)}
                  label={a.loginDisabled ? 'Đã khóa' : 'Được đăng nhập'}
                  disabled={pending}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <Modal open={dialogOpen} onClose={closeDialog} title="Đặt mật khẩu">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            savePasswords()
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-bold text-[#4A476E]">
            Mật khẩu mới cho {count} bạn đã chọn
            <input
              aria-label="Mật khẩu mới"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              maxLength={72}
            />
          </label>
          <p className="m-0 text-[13px] text-muted">
            Ít nhất 6 ký tự. Cô nhớ báo mật khẩu cho các bạn; sau khi đăng nhập các bạn tự đổi lại được.
          </p>
          {dialogError && <Notice tone="error">{dialogError}</Notice>}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={closeDialog} disabled={pending}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
