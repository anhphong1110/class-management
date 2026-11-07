'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { signIn, type SignInState } from '../actions'

const TABS = [
  {
    key: 'teacher',
    label: 'Giáo viên',
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    userLabel: 'Tên đăng nhập của cô',
    userHint: 'Ví dụ: co.ten',
    note: 'Tài khoản giáo viên có toàn quyền quản trị lớp học.',
  },
  {
    key: 'student',
    label: 'Học sinh',
    icon: 'M6 8a6 6 0 0 1 12 0v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3zM9 14h6M10 3v3M14 3v3',
    userLabel: 'Tên đăng nhập của em',
    userHint: 'Ví dụ: hs.minhanh',
    note: 'Tài khoản học sinh do cô giáo tạo. Em chỉ xem được sao, bảng xếp hạng, quà tặng và thời khóa biểu.',
  },
] as const

type TabKey = (typeof TABS)[number]['key']

const TAB_STORAGE = 'login-tab'

function rememberTab(key: TabKey) {
  try {
    localStorage.setItem(TAB_STORAGE, key)
  } catch {
    // Không lưu được (chế độ riêng tư, chặn lưu trữ) thì bỏ qua.
  }
}

export default function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [tab, setTab] = useState<TabKey>('teacher')
  const [show, setShow] = useState(false)
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {
    error: initialError,
  })
  const t = TABS.find((x) => x.key === tab)!

  // Nhớ tab lần trước để học sinh không phải chọn lại mỗi lần.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE)
      if (saved === 'teacher' || saved === 'student') setTab(saved)
    } catch {
      // Bỏ qua: vẫn dùng tab mặc định.
    }
  }, [])

  const choose = (key: TabKey) => {
    setTab(key)
    rememberTab(key)
  }

  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="next" value={next ?? ''} />
      <SegmentedTabs items={TABS} value={tab} onChange={choose} idPrefix="tab" panelId="login-panel" label="Loại tài khoản" />
      <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-[18px]">
        <Field label={t.userLabel}>
          {(p) => (
            <Input
              {...p}
              type="text"
              name="username"
              placeholder={t.userHint}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          )}
        </Field>
        <Field label="Mật khẩu">
          {(p) => (
            <div className="relative">
              <Input
                {...p}
                type={show ? 'text' : 'password'}
                name="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                required
                className="pr-14"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-pressed={show}
                aria-label={show ? 'Ẩn ký tự đã nhập' : 'Hiện ký tự đã nhập'}
                className="absolute right-1.5 top-1.5 flex size-10 items-center justify-center rounded-chip bg-transparent text-muted transition-colors hover:bg-primary-soft hover:text-primary-deep"
              >
                <Icon d={show ? ICONS.eyeOff : ICONS.eye} size={20} />
              </button>
            </div>
          )}
        </Field>
      </div>
      <div role="alert" aria-live="polite">
        {state.error && (
          <p className="m-0 flex items-start gap-2 rounded-ctl bg-danger-soft px-3 py-2.5 text-[15px] font-bold text-danger-deep">
            <Icon d={ICONS.alert} size={18} className="mt-0.5" />
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" loading={pending} className="min-h-[56px]! w-full disabled:opacity-60!">
        {!pending && <Icon d={ICONS.rocket} size={22} />}
        {pending ? 'Đang bay…' : 'Cất cánh'}
      </Button>
      <div className="rounded-ctl bg-primary-soft px-3 py-2.5 text-[14px] font-semibold leading-normal text-primary-deep">{t.note}</div>
    </form>
  )
}
