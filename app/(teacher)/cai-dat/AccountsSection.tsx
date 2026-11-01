'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { toVietnameseMessage } from '@/lib/errors'
import type { AccountRow } from '@/lib/accounts/queries'
import { createStudentAccounts, resetStudentPassword, setStudentLogin, type TempAccount } from './accounts-actions'

type Shown = { rows: TempAccount[]; failed: { name: string; reason: string }[] }

const card =
  'flex flex-col gap-3.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'

/** Khi in: ẩn mọi thứ ngoài bảng mật khẩu (bảng được đưa thẳng vào <body> nên chỉ cần ẩn các phần tử anh em). */
const PRINT_CSS = '@media print { body > *:not(#pw-print) { display: none !important } #pw-print { display: block !important } }'

function PasswordTable({ rows }: { rows: TempAccount[] }) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b-2 border-[#E4E0F7]">
          <th className="py-1.5 pr-3 font-extrabold">Họ tên</th>
          <th className="py-1.5 pr-3 font-extrabold">Tên đăng nhập</th>
          <th className="py-1.5 font-extrabold">Mật khẩu tạm</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.username} className="border-b border-[#E4E0F7]">
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
          Tạo tài khoản hàng loạt
        </Button>
      </div>
      <p className="m-0 text-[13.5px] text-muted">
        Cô không xem lại được mật khẩu của học sinh, chỉ đặt lại để nhận mật khẩu tạm mới. Mật khẩu tạm chỉ hiện một lần.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="success">{info}</Notice>}
      <div className="overflow-x-auto">
        <ul className="m-0 flex min-w-[560px] list-none flex-col gap-2 p-0">
          {accounts.map((a) => (
            <li
              key={a.studentId}
              aria-label={a.name}
              className="grid items-center gap-2.5 rounded-[14px] bg-[#F6F4FF] px-3.5 py-1.5 [grid-template-columns:1.6fr_1.3fr_1fr_1.2fr]"
            >
              <div className="text-[15px] font-extrabold">{a.name}</div>
              <div className="text-sm font-bold text-[#4A476E]">{a.username ?? ''}</div>
              {a.username === null ? (
                <div className="col-span-2 text-sm font-bold text-muted">Chưa có tài khoản</div>
              ) : (
                <>
                  <Switch
                    checked={!a.loginDisabled}
                    onChange={(next) => setLogin(a.studentId, next)}
                    label={a.loginDisabled ? 'Đã khóa' : 'Được đăng nhập'}
                    disabled={pending}
                  />
                  <Button variant="secondary" onClick={() => reset(a.studentId)} disabled={pending}>
                    Đặt lại mật khẩu
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

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
            <p className="m-0 text-sm font-bold text-[#4A476E]">Mật khẩu tạm chỉ hiện một lần. Cô in hoặc ghi lại trước khi đóng.</p>
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
