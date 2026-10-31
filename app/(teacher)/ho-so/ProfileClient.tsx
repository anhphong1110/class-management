'use client'

import { useRef, useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { Toggle } from '@/components/ui/Toggle'
import { validateImageFile } from '@/lib/domain/upload'
import { toVietnameseMessage } from '@/lib/errors'
import { saveAvatar, setStudentCanChangeAvatar, uploadAvatar, type AvatarTarget } from './actions'

export type LibraryItem = { id: string; label: string; avatar: AvatarValue }
export type Person = { key: string; target: AvatarTarget; name: string; role: string; avatarId: string | null }

export function ProfileClient({
  people,
  library,
  allowStudents,
}: {
  people: Person[]
  library: LibraryItem[]
  allowStudents: boolean
}) {
  const [who, setWho] = useState(0)
  const [pending, setPending] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [allow, setAllow] = useState(allowStudents)
  const [busy, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const person = people[who]
  const byId = new Map(library.map((a) => [a.id, a]))
  const current = person.avatarId ? byId.get(person.avatarId) : undefined
  const pendingId = pending ?? person.avatarId
  const pendingItem = pendingId ? byId.get(pendingId) : undefined

  function pickPerson(i: number) {
    setWho(i)
    setPending(null)
    setMsg(null)
  }

  function save() {
    if (!pendingId) return
    startTransition(async () => {
      const res = await saveAvatar(person.target, pendingId)
      if (res.error) setMsg({ tone: 'error', text: res.error })
      else {
        setPending(null)
        setMsg({ tone: 'success', text: `Đã lưu avatar cho ${person.name}.` })
      }
    })
  }

  function onFile(file: File | undefined) {
    if (!file) return
    const check = validateImageFile(file)
    if (!check.ok) {
      setMsg({ tone: 'error', text: toVietnameseMessage(check.error) })
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    const form = new FormData()
    form.set('file', file)
    form.set('label', file.name.replace(/\.[^.]+$/, ''))
    startTransition(async () => {
      const res = await uploadAvatar(form)
      if (res.error) setMsg({ tone: 'error', text: res.error })
      else {
        if (res.avatarId) setPending(res.avatarId)
        setMsg({ tone: 'success', text: 'Đã thêm avatar vào thư viện của lớp.' })
      }
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function flipAllow(next: boolean) {
    setAllow(next)
    startTransition(async () => {
      const res = await setStudentCanChangeAvatar(next)
      if (res.error) {
        setAllow(!next)
        setMsg({ tone: 'error', text: res.error })
      }
    })
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <section
        data-testid="people"
        className="flex max-w-[380px] flex-[1_1_280px] flex-col gap-2 rounded-[26px] bg-white p-[18px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]"
      >
        <h2 className="m-0 mb-1 ml-1 font-display text-xl font-extrabold">Chọn người cần đổi avatar</h2>
        {people.map((p, i) => {
          const on = i === who
          const av = p.avatarId ? byId.get(p.avatarId)?.avatar ?? null : null
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => pickPerson(i)}
              className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[18px] border-2 px-3 py-1.5 text-left text-ink ${
                on ? 'border-primary-strong bg-[#EEF0FF]' : 'border-[#E4E0F7] bg-white'
              }`}
            >
              <AvatarImage avatar={av} size={46} />
              <span className="flex flex-col">
                <span className="text-[15px] font-extrabold">{p.name}</span>
                <span className="text-[12.5px] font-bold text-muted">{p.role}</span>
              </span>
            </button>
          )
        })}
      </section>

      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-4">
        <div
          data-testid="current"
          className="flex flex-wrap items-center gap-5 rounded-[30px] border-2 border-lavender bg-gradient-to-br from-[#ECE9FF] to-white p-6"
        >
          <AvatarImage avatar={current?.avatar ?? null} size={150} />
          <div className="flex flex-[1_1_220px] flex-col gap-1.5">
            <div className="text-[13px] font-extrabold tracking-[0.1em] text-[#3441B5]">{person.role.toUpperCase()}</div>
            <div className="font-display text-[30px] font-extrabold leading-[1.1]">{person.name}</div>
            <div className="text-[14.5px] font-bold text-muted">
              Avatar hiện tại: {current?.label || 'Chưa chọn'}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-[28px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
          <div>
            <h2 className="m-0 font-display text-[22px] font-extrabold">Thư viện avatar của lớp</h2>
            <div className="text-sm text-muted">
              Gồm các avatar có sẵn và avatar cô đã tải lên. Học sinh chỉ chọn được trong thư viện này.
            </div>
          </div>
          <div data-testid="library" className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
            {library.map((a) => {
              const on = a.id === pendingId
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={a.label}
                  onClick={() => {
                    setPending(a.id)
                    setMsg(null)
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-[20px] border-2 px-1.5 py-2.5 text-ink ${
                    on ? 'border-primary-strong bg-[#EEF0FF]' : 'border-[#E4E0F7] bg-white'
                  }`}
                >
                  <AvatarImage avatar={a.avatar} size={76} />
                  <span className="text-[12.5px] font-extrabold">{a.label}</span>
                </button>
              )
            })}
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[118px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed border-[#8E86D8] bg-bg px-1.5 py-2.5 text-center text-[13px] font-extrabold text-[#3441B5] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
              </svg>
              <span>
                Tải avatar lên
                <br />
                (chỉ giáo viên)
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Chọn ảnh avatar"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-sm font-bold text-muted">Đang chọn: {pendingItem?.label || 'Chưa chọn'}</div>
            <Button onClick={save} disabled={busy || !pendingId} className="min-h-[52px] rounded-2xl px-7 text-base">
              Lưu avatar
            </Button>
          </div>
        </div>

        <div className="rounded-[24px] bg-white px-6 py-5 shadow-[0_6px_20px_rgba(102,117,232,0.10)]">
          <Toggle
            checked={allow}
            onChange={flipAllow}
            label="Quyền đổi avatar của học sinh"
            hint="Khi bật, học sinh tự chọn avatar trong thư viện ở trang hồ sơ của mình. Khi tắt, chỉ cô được đổi."
          />
        </div>
      </div>
    </div>
  )
}
