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
    avatar: '/brand/login/avatar-co.webp',
    userLabel: 'Tên đăng nhập của cô',
    userHint: 'Ví dụ: co.ten',
    note: 'Tài khoản giáo viên có toàn quyền quản trị lớp học.',
  },
  {
    key: 'student',
    label: 'Học sinh',
    avatar: '/brand/login/avatar-hs.webp',
    userLabel: 'Tên đăng nhập của em',
    userHint: 'Ví dụ: hs.minhanh',
    note: 'Tài khoản học sinh do cô giáo tạo. Em chỉ xem được sao, bảng xếp hạng, quà tặng và thời khóa biểu.',
  },
] as const

type TabKey = (typeof TABS)[number]['key']

// Nhãn tab kèm hình đại diện chibi (hình trang trí nên alt rỗng; tên truy cập vẫn là "Giáo viên"/"Học sinh").
const TAB_ITEMS = TABS.map((x) => ({
  key: x.key,
  label: (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={x.avatar} alt="" aria-hidden="true" width={32} height={32} className="sp-tab-ava" />
      {x.label}
    </>
  ),
}))

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
      <SegmentedTabs items={TAB_ITEMS} value={tab} onChange={choose} idPrefix="tab" panelId="login-panel" label="Loại tài khoản" />
      <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-[18px]">
        <Field label={t.userLabel}>
          {(p) => (
            <div className="sp-input">
              <Icon d={ICONS.user} size={20} />
              <Input
                {...p}
                type="text"
                name="username"
                placeholder={t.userHint}
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>
          )}
        </Field>
        <Field label="Mật khẩu">
          {(p) => (
            <div className="sp-input">
              <Icon d={ICONS.lock} size={20} />
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
                className="sp-eye absolute right-1.5 top-1.5 flex size-10 items-center justify-center rounded-chip bg-transparent transition-colors"
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
      <Button type="submit" size="lg" loading={pending} className="sp-cta min-h-[56px]! w-full">
        {!pending && <Icon d={ICONS.rocket} size={22} />}
        {pending ? 'Đang bay…' : 'Cất cánh'}
      </Button>
      <p className="sp-note">
        <Icon d={ICONS.lock} size={16} />
        {t.note}
      </p>
    </form>
  )
}
