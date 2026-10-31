'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Notice } from '@/components/ui/Notice'
import type { StarGroup } from '@/lib/stars/queries'
import type { StudentCard } from '@/lib/students/queries'
import { createGroup, deleteGroup, moveStudent, setGroupRole } from './actions'

const ROLE_STYLE = {
  leader: ['Tổ trưởng', '#FFC857', '#4A3300'],
  deputy: ['Tổ phó', '#E3EEFF', '#1F4C9E'],
  member: ['Thành viên', '#fff', '#4A476E'],
} as const
const ORDER = { leader: 0, deputy: 1, member: 2 } as const

const roleBtn =
  'min-h-11 cursor-pointer rounded-xl border-[1.5px] border-[#D9D5F2] bg-white px-3 text-[13px] font-extrabold text-[#3441B5] disabled:cursor-not-allowed disabled:opacity-60'

export function GroupsView({ students, groups }: { students: StudentCard[]; groups: StarGroup[] }) {
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ error?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      setError(res.error ?? '')
      if (!res.error) after?.()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      <div data-testid="groups-view" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))' }}>
        {groups.map((g) => {
          const members = students
            .filter((s) => s.groupName !== null && g.memberIds.includes(s.id))
            .sort((a, b) => ORDER[a.groupRole ?? 'member'] - ORDER[b.groupRole ?? 'member'] || a.rollNo - b.rollNo)
          const stars = members.reduce((n, s) => n + s.competition, 0)
          return (
            <div
              key={g.id}
              data-testid="group-card"
              role="group"
              aria-label={g.name}
              className="flex flex-col gap-3 rounded-[26px] bg-white p-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-display text-[22px] font-extrabold leading-[1.1]">{g.name}</div>
                  <div data-testid="group-summary" className="text-[13.5px] font-bold text-[#5B5890]">
                    {members.length} bạn · {stars} sao tích lũy
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.length === 0 ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteGroup(g.id))}
                      className="min-h-11 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-4 text-sm font-extrabold text-[#8E1B3B] disabled:opacity-60"
                    >
                      Xóa tổ
                    </button>
                  ) : (
                    <Link
                      href={`/thi-dua?to=${g.id}`}
                      className="inline-flex min-h-11 items-center rounded-[14px] bg-[#FFC857] px-4 text-sm font-extrabold text-[#3B2A00]"
                    >
                      Cộng sao cả tổ
                    </Link>
                  )}
                </div>
              </div>
              {members.map((m) => {
                const [label, bg, ink] = ROLE_STYLE[m.groupRole ?? 'member']
                return (
                  <div key={m.id} data-testid="group-member" className="flex flex-col gap-2 rounded-[18px] bg-[#F6F4FF] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <AvatarImage avatar={m.avatar} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-extrabold">{m.fullName}</div>
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-extrabold" style={{ background: bg, color: ink }}>
                          {label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" disabled={pending} className={roleBtn} onClick={() => run(() => setGroupRole(m.id, 'leader'))}>
                        Đặt tổ trưởng
                      </button>
                      <button type="button" disabled={pending} className={roleBtn} onClick={() => run(() => setGroupRole(m.id, 'deputy'))}>
                        Đặt tổ phó
                      </button>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#4A476E]">
                        Chuyển sang
                        <select
                          aria-label="Chuyển tổ"
                          disabled={pending}
                          value={g.id}
                          onChange={(e) => run(() => moveStudent(m.id, e.target.value))}
                          className="min-h-11 rounded-xl border-2 border-[#D9D5F2] bg-white px-2 text-sm font-bold text-ink"
                        >
                          {groups.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {adding ? (
        <form
          className="flex flex-wrap items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => createGroup(newName), () => setAdding(false))
          }}
        >
          <label className="flex items-center gap-2 text-sm font-bold text-[#4A476E]">
            Tên tổ
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={200}
              className="min-h-12 rounded-[14px] border-2 border-[#D9D5F2] bg-white px-3 text-base font-semibold text-ink"
            />
          </label>
          <button type="submit" disabled={pending} className="min-h-12 rounded-[14px] bg-[#4F5BD5] px-5 text-[15px] font-extrabold text-white disabled:opacity-60">
            Lưu tổ
          </button>
          <button type="button" onClick={() => setAdding(false)} className={`${roleBtn} min-h-12`}>
            Hủy
          </button>
        </form>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              setNewName(`Tổ ${groups.length + 1}`)
              setAdding(true)
            }}
            className="min-h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-5 text-[15px] font-extrabold text-[#3441B5]"
          >
            + Thêm tổ
          </button>
        </div>
      )}
    </div>
  )
}
