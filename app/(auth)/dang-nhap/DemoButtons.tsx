'use client'

import { useActionState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { demoSignIn, type SignInState } from '../actions'
import type { Role } from '@/lib/domain/types'

const LABELS: Record<Role, string> = {
  teacher: 'Vào với tư cách Cô giáo',
  student: 'Vào với tư cách Học sinh',
}

export default function DemoButtons({ roles, next }: { roles: Role[]; next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(demoSignIn, {})
  return (
    <form action={action} data-testid="demo-login" className="flex flex-col gap-3 rounded-panel border-2 border-dashed border-primary-strong bg-primary-soft p-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <div className="text-[15px] font-extrabold text-primary-deep">Dành cho ban giám khảo: bấm để vào ngay, không cần mật khẩu</div>
      <div className="flex flex-wrap gap-2.5">
        {roles.map((r) => (
          <button
            key={r}
            type="submit"
            name="role"
            value={r}
            disabled={pending}
            className="clay-press inline-flex min-h-12 flex-[1_1_180px] items-center justify-center gap-2 rounded-ctl border-0 bg-primary-strong px-4 text-[15px] font-extrabold text-white [--edge:var(--primary-deep)] hover:bg-primary-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon d={ICONS.rocket} size={18} />
            {LABELS[r]}
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
