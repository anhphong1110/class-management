'use client'

import { useActionState } from 'react'
import { demoSignIn, type SignInState } from '../actions'
import type { Role } from '@/lib/domain/types'

const LABELS: Record<Role, string> = {
  teacher: 'Vào với tư cách Cô giáo',
  student: 'Vào với tư cách Học sinh',
}

export default function DemoButtons({ roles, next }: { roles: Role[]; next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(demoSignIn, {})
  return (
    <form action={action} data-testid="demo-login" className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-primary-strong bg-bg p-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <div className="text-[15px] font-extrabold text-ink">Dành cho ban giám khảo: bấm để vào ngay, không cần mật khẩu</div>
      <div className="flex flex-wrap gap-2.5">
        {roles.map((r) => (
          <button
            key={r}
            type="submit"
            name="role"
            value={r}
            disabled={pending}
            className="inline-flex min-h-12 flex-[1_1_180px] cursor-pointer items-center justify-center rounded-xl border-0 bg-gradient-to-r from-primary-strong to-[#7A58E0] px-4 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
      <div role="alert" aria-live="polite">
        {state.error && (
          <p className="m-0 rounded-xl bg-[#FFE9F1] px-3 py-2.5 text-sm font-bold text-[#B3235F]">{state.error}</p>
        )}
      </div>
    </form>
  )
}
