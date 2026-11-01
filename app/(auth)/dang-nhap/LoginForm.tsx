'use client'

import { useActionState, useState } from 'react'
import { signIn, type SignInState } from '../actions'

const TABS = [
  {
    key: 'teacher',
    label: 'Giáo viên',
    userLabel: 'Tên đăng nhập của cô',
    userHint: 'Ví dụ: co.khanh',
    note: 'Tài khoản giáo viên có toàn quyền quản trị lớp học.',
  },
  {
    key: 'student',
    label: 'Học sinh',
    userLabel: 'Tên đăng nhập của em',
    userHint: 'Ví dụ: hs.minhanh',
    note: 'Tài khoản học sinh do cô giáo tạo. Em chỉ xem được sao, bảng xếp hạng, quà tặng và thời khóa biểu.',
  },
] as const

const INPUT =
  'min-h-[52px] box-border rounded-[14px] border-2 border-[#D9D5F2] px-4 text-base font-semibold text-ink focus:border-primary-strong focus:outline-none'

export default function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('teacher')
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {
    error: initialError,
  })
  const t = TABS.find((x) => x.key === tab)!

  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="next" value={next ?? ''} />
      <div role="tablist" aria-label="Loại tài khoản" className="flex gap-1.5 rounded-2xl bg-[#F1EFFC] p-[5px]">
        {TABS.map((x) => {
          const on = x.key === tab
          return (
            <button
              key={x.key}
              type="button"
              role="tab"
              id={`tab-${x.key}`}
              aria-selected={on}
              aria-controls="login-panel"
              tabIndex={on ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
                e.preventDefault()
                const next = TABS[(TABS.findIndex((y) => y.key === x.key) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
                setTab(next.key)
                document.getElementById(`tab-${next.key}`)?.focus()
              }}
              onClick={() => setTab(x.key)}
              className={`min-h-[46px] flex-1 cursor-pointer rounded-xl border-0 text-[15px] font-extrabold ${
                on ? 'bg-primary-strong text-white' : 'bg-transparent text-[#3A3769]'
              }`}
            >
              {x.label}
            </button>
          )
        })}
      </div>
      <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-[18px]">
      <label className="flex flex-col gap-1.5 text-[14.5px] font-extrabold text-[#4A476E]">
        {t.userLabel}
        <input
          type="text"
          name="username"
          placeholder={t.userHint}
          autoComplete="username"
          autoCapitalize="none"
          required
          className={INPUT}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[14.5px] font-extrabold text-[#4A476E]">
        Mật khẩu
        <input
          type="password"
          name="password"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
          className={INPUT}
        />
      </label>
      </div>
      <div role="alert" aria-live="polite">
        {state.error && (
          <p className="m-0 rounded-xl bg-[#FFE9F1] px-3 py-2.5 text-sm font-bold text-[#B3235F]">
            {state.error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl border-0 bg-gradient-to-r from-primary-strong to-[#7A58E0] text-lg font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cất cánh
      </button>
      <div className="rounded-xl bg-bg px-3 py-2.5 text-[13px] leading-normal text-muted">{t.note}</div>
    </form>
  )
}
