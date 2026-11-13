'use client'

import { useActionState, useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { demoSignIn, type SignInState } from '../actions'
import { LaunchOverlay } from './LaunchOverlay'
import type { Role } from '@/lib/domain/types'

const LABELS: Record<Role, string> = {
  teacher: 'Vào với tư cách Cô giáo',
  student: 'Vào với tư cách Học sinh',
}

export default function DemoButtons({ roles, next }: { roles: Role[]; next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(demoSignIn, {})
  // Nút nào được bấm thì nút đó hiện "Đang bay…"; nút còn lại chỉ bị khóa.
  const [clicked, setClicked] = useState<Role | null>(null)
  return (
    <form action={action} data-testid="demo-login" className="sp-demo">
      <input type="hidden" name="next" value={next ?? ''} />
      <LaunchOverlay show={pending} />
      <div className="sp-demo-title">Dành cho ban giám khảo: bấm để vào ngay, không cần mật khẩu</div>
      <div className="flex flex-wrap gap-2.5">
        {roles.map((r) => (
          <button
            key={r}
            type="submit"
            name="role"
            value={r}
            disabled={pending}
            onClick={() => setClicked(r)}
            className="sp-demo-btn clay-press inline-flex min-h-12 flex-[1_1_180px] items-center justify-center gap-2 rounded-ctl border-0 px-4 text-[15px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && clicked === r ? (
              <Icon d={ICONS.spinner} size={18} className="motion-safe:animate-spin" />
            ) : (
              <Icon d={ICONS.rocket} size={18} />
            )}
            {pending && clicked === r ? 'Đang bay…' : LABELS[r]}
          </button>
        ))}
      </div>
      <div role="alert" aria-live="polite">
        {state.error && (
          <p className="m-0 flex items-start gap-2 rounded-ctl bg-danger-soft px-3 py-2.5 text-[15px] font-bold text-danger-deep">
            <Icon d={ICONS.alert} size={18} className="mt-0.5" />
            {state.error}
          </p>
        )}
      </div>
    </form>
  )
}
