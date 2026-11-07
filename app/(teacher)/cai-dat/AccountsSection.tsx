'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { toVietnameseMessage } from '@/lib/errors'
import type { AccountRow } from '@/lib/accounts/queries'
import { createStudentAccounts, resetStudentPassword, setStudentLogin, type TempAccount } from './accounts-actions'

type Shown = { rows: TempAccount[]; failed: { name: string; reason: string }[] }

const card = 'clay-card flex flex-col gap-3.5 px-6 py-[22px]'
const SPIN = 'M21 12a9 9 0 1 1-6.2-8.6'

/** Khi in: ẩn mọi thứ ngoài bảng mật khẩu (bảng được đưa thẳng vào <body> nên chỉ cần ẩn các phần tử anh em). */
const PRINT_CSS = '@media print { body > *:not(#pw-print) { display: none !important } #pw-print { display: block !important } }'

function PasswordTable({ rows }: { rows: TempAccount[] }) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b-2 border-edge">
          <th className="py-1.5 pr-3 font-extrabold">Họ tên</th>
          <th className="py-1.5 pr-3 font-extrabold">Tên đăng nhập</th>
          <th className="py-1.5 font-extrabold">Mật khẩu tạm</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.username} className="border-b border-edge">
            <td className="py-1.5 pr-3 font-bold">{r.name}</td>
            <td className="py-1.5 pr-3">{r.username}</td>
            <td className="py-1.5 font-mono text-base font-bold tracking-wider">{r.password}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function AccountsSection({ accounts }: { accounts: AccountRow[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [shown, setShown] = useState<Shown | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [resetFor, setResetFor] = useState<AccountRow | null>(null)
  const missing = accounts.filter((a) => a.username === null).length

  const unknown = () => setError(toVietnameseMessage('unknown'))

  function createAll() {
    setError(null)
    setInfo(null)
    startTransition(async () => {
      try {
        const res = await createStudentAccounts()
        if (res.created.length === 0 && res.failed.length === 0) setInfo('Tất cả học sinh đã có tài khoản.')
        else setShown({ rows: res.created, failed: res.failed })
      } catch {
        unknown()
      }
    })
  }

  function reset(studentId: string) {
    setError(null)
    setInfo(null)
    startTransition(async () => {
      try {
        const res = await resetStudentPassword(studentId)
        if ('error' in res) setError(res.error)
        else setShown({ rows: [res], failed: [] })
      } catch {
        unknown()
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
          {pending ? <Icon d={SPIN} size={16} className="motion-safe:animate-spin" /> : <Icon d={ICONS.plus} size={18} />}
          Tạo tài khoản hàng loạt
        </Button>
      </div>
      <p className="m-0 text-sm font-semibold text-muted">
        Cô không xem lại được mật khẩu của học sinh, chỉ đặt lại để nhận mật khẩu tạm mới. Mật khẩu tạm chỉ hiện một lần.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="success">{info}</Notice>}
      {accounts.length === 0 && (
        <EmptyState title="Chưa có học sinh nào" icon={ICONS.users}>
          Khi cô thêm học sinh ở trang Học sinh, danh sách tài khoản sẽ hiện ở đây.
        </EmptyState>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {accounts.map((a) => (
          <li
            key={a.studentId}
            aria-label={a.name}
            className="grid items-center gap-2.5 rounded-ctl border-2 border-edge bg-field px-3.5 py-2 sm:[grid-template-columns:1.6fr_1.3fr_1fr_1.2fr]"
          >
            <div className="text-[15px] font-extrabold">{a.name}</div>
            <div className="text-sm font-bold text-muted">{a.username ?? ''}</div>
            {a.username === null ? (
              <div className="flex items-center gap-1.5 text-sm font-bold text-muted sm:col-span-2">
                <Icon d={ICONS.user} size={16} />
                Chưa có tài khoản
              </div>
            ) : (
              <>
                <Switch
                  checked={!a.loginDisabled}
                  onChange={(next) => setLogin(a.studentId, next)}
                  label={a.loginDisabled ? 'Đã khóa' : 'Được đăng nhập'}
                  disabled={pending}
                />
                <Button variant="secondary" onClick={() => setResetFor(a)} disabled={pending}>
                  Đặt lại mật khẩu
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={resetFor !== null}
        title="Đặt lại mật khẩu?"
        message={
          resetFor
            ? `Mật khẩu cũ của ${resetFor.name} sẽ không dùng được nữa. Cô sẽ nhận một mật khẩu tạm mới, chỉ hiện một lần.`
            : ''
        }
        confirmLabel="Đặt lại"
        cancelLabel="Hủy"
        danger
        onCancel={() => setResetFor(null)}
        onConfirm={() => {
          const a = resetFor
          setResetFor(null)
          if (a) reset(a.studentId)
        }}
      />

      {/* Chỉ đóng bằng nút "Đóng" (không Esc, không bấm nền) để cô không lỡ mất mật khẩu tạm. */}
      <Modal open={shown !== null} onClose={() => {}} title="Mật khẩu tạm">
        {shown && (
          <div className="flex flex-col gap-3">
            {shown.rows.length > 0 && (
              <div className="max-h-[50vh] overflow-auto">
                <PasswordTable rows={shown.rows} />
              </div>
            )}
            {shown.failed.length > 0 && (
              <div>
                <div className="font-extrabold">Chưa tạo được:</div>
                <ul className="m-0 pl-5 text-sm">
                  {shown.failed.map((f) => (
                    <li key={f.name}>
                      {f.name}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="m-0 text-sm font-bold text-muted">Mật khẩu tạm chỉ hiện một lần. Cô in hoặc ghi lại trước khi đóng.</p>
            <div className="flex flex-wrap justify-end gap-2.5">
              {shown.rows.length > 0 && (
                <Button variant="secondary" onClick={() => window.print()}>
                  In danh sách
                </Button>
              )}
              <Button
                onClick={() => {
                  if (shown.rows.length > 0) setConfirmClose(true)
                  else setShown(null)
                }}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Cô đã in hoặc ghi lại mật khẩu tạm chưa? Đóng rồi sẽ không xem lại được."
      >
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setConfirmClose(false)}>
            Quay lại
          </Button>
          <Button
            onClick={() => {
              setConfirmClose(false)
              setShown(null)
            }}
          >
            Đã ghi, đóng
          </Button>
        </div>
      </Modal>
      {shown && shown.rows.length > 0 &&
        createPortal(
          <div id="pw-print" className="hidden p-6 text-black">
            <style>{PRINT_CSS}</style>
            <h1 className="mb-3 text-xl font-bold">Mật khẩu tạm</h1>
            <PasswordTable rows={shown.rows} />
          </div>,
          document.body,
        )}
    </section>
  )
}
