'use client'

import { useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import type { StarGroup } from '@/lib/stars/queries'
import type { StudentCard } from '@/lib/students/queries'
import { createGroup, deleteGroup, moveStudent, setGroupRole } from './actions'

const ROLE_STYLE = {
  leader: ['Tổ trưởng', 'bg-star text-star-ink', ICONS.star],
  deputy: ['Tổ phó', 'bg-primary-soft text-primary-deep', ICONS.check],
  member: ['Thành viên', 'bg-white text-muted border border-edge', ICONS.user],
} as const
const ORDER = { leader: 0, deputy: 1, member: 2 } as const

export function GroupsView({ students, groups }: { students: StudentCard[]; groups: StarGroup[] }) {
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<StarGroup | null>(null)
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ error?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      setError(res.error ?? '')
      if (!res.error) after?.()
    })
  }

  const grouped = new Set(groups.flatMap((g) => g.memberIds))
  const unassigned = students.filter((s) => !grouped.has(s.id)).sort((a, b) => a.rollNo - b.rollNo)

  const roleBtn = '!min-h-11 !px-3 text-[13.5px]'

  return (
    <div className="flex flex-col gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      {groups.length === 0 && (
        <EmptyState title="Lớp chưa chia tổ" icon={ICONS.users}>
          Cô tạo tổ đầu tiên bằng nút Thêm tổ bên dưới nhé.
        </EmptyState>
      )}
      <div data-testid="groups-view" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))' }}>
        {groups.map((g) => {
          const members = students
            .filter((s) => s.groupName !== null && g.memberIds.includes(s.id))
            .sort((a, b) => ORDER[a.groupRole ?? 'member'] - ORDER[b.groupRole ?? 'member'] || a.rollNo - b.rollNo)
          const stars = members.reduce((n, s) => n + s.competition, 0)
          return (
            <div key={g.id} data-testid="group-card" role="group" aria-label={g.name} className="clay-card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-display text-[22px] font-extrabold leading-[1.1]">{g.name}</div>
                  <div data-testid="group-summary" className="text-[13.5px] font-bold text-muted">
                    {members.length} bạn · {stars} sao tích lũy
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.length === 0 ? (
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => setDeleting(g)}
                      className="!border-danger !text-danger-deep [--edge:var(--color-danger-soft)] hover:!bg-danger-soft"
                    >
                      <Icon d={ICONS.trash} size={18} />
                      Xóa tổ
                    </Button>
                  ) : (
                    <ButtonLink variant="accent" href={`/thi-dua?to=${g.id}`} className="!px-4 !text-sm">
                      <Icon d={ICONS.star} size={18} />
                      Cộng sao cả tổ
                    </ButtonLink>
                  )}
                </div>
              </div>
              {members.map((m) => {
                const [label, tone, icon] = ROLE_STYLE[m.groupRole ?? 'member']
                return (
                  <div key={m.id} data-testid="group-member" className="flex flex-col gap-2 rounded-panel bg-bg px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <AvatarImage avatar={m.avatar} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-extrabold">{m.fullName}</div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${tone}`}>
                          <Icon d={icon} size={12} />
                          {label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" disabled={pending} className={roleBtn} onClick={() => run(() => setGroupRole(m.id, 'leader'))}>
                        Đặt tổ trưởng
                      </Button>
                      <Button variant="secondary" disabled={pending} className={roleBtn} onClick={() => run(() => setGroupRole(m.id, 'deputy'))}>
                        Đặt tổ phó
                      </Button>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
                        Chuyển sang
                        <Select
                          aria-label="Chuyển tổ"
                          disabled={pending}
                          value={g.id}
                          onChange={(e) => run(() => moveStudent(m.id, e.target.value))}
                          className="!min-h-11 !w-auto !px-2 text-sm"
                        >
                          {groups.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
        {unassigned.length > 0 && (
          <div role="group" aria-label="Chưa có tổ" data-testid="ungrouped-card" className="clay-card flex flex-col gap-3 p-5">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.1]">Chưa có tổ</div>
              <div data-testid="group-summary" className="text-[13.5px] font-bold text-muted">
                {unassigned.length} bạn
              </div>
            </div>
            {unassigned.map((m) => (
              <div key={m.id} data-testid="group-member" className="flex flex-col gap-2 rounded-panel bg-bg px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <AvatarImage avatar={m.avatar} size={44} />
                  <div className="min-w-0 flex-1 text-[15px] font-extrabold">{m.fullName}</div>
                </div>
                <label className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
                  Chuyển sang
                  <Select
                    aria-label="Chuyển tổ"
                    disabled={pending}
                    value=""
                    onChange={(e) => e.target.value && run(() => moveStudent(m.id, e.target.value))}
                    className="!min-h-11 !w-auto !px-2 text-sm"
                  >
                    <option value="">Chọn tổ</option>
                    {groups.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {adding ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => createGroup(newName), () => setAdding(false))
          }}
        >
          <Field label="Tên tổ">
            {(f) => <Input {...f} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={200} className="!w-[220px]" />}
          </Field>
          <Button type="submit" disabled={pending}>
            Lưu tổ
          </Button>
          <Button variant="secondary" onClick={() => setAdding(false)}>
            Hủy
          </Button>
        </form>
      ) : (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setNewName(`Tổ ${groups.length + 1}`)
              setAdding(true)
            }}
          >
            + Thêm tổ
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        danger
        title="Xóa tổ này?"
        message={`Tổ "${deleting?.name ?? ''}" đang trống nên xóa không ảnh hưởng bạn nào. Cô muốn xóa tổ này chứ?`}
        confirmLabel="Xóa tổ"
        cancelLabel="Hủy"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          const id = deleting.id
          setDeleting(null)
          run(() => deleteGroup(id))
        }}
      />
    </div>
  )
}
