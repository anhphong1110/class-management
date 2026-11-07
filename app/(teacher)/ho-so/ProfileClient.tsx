'use client'

import { useRef, useState, useTransition } from 'react'
import { AvatarImage, type AvatarValue } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { compressImage } from '@/lib/domain/compress-image'
import { MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'
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
        setMsg({ tone: 'success', text: `Đã đổi avatar của ${person.name}.` })
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
    startTransition(async () => {
      try {
        const small = await compressImage(file)
        const recheck = validateImageFile(small, MAX_UPLOAD_BYTES)
        if (!recheck.ok) {
          setMsg({ tone: 'error', text: toVietnameseMessage(recheck.error) })
          if (fileRef.current) fileRef.current.value = ''
          return
        }
        const form = new FormData()
        form.set('file', small)
        form.set('label', file.name.replace(/\.[^.]+$/, ''))
        const res = await uploadAvatar(form)
        if (res.error) setMsg({ tone: 'error', text: res.error })
        else {
          if (res.avatarId) setPending(res.avatarId)
          setMsg({ tone: 'success', text: 'Đã thêm avatar vào thư viện của lớp.' })
        }
      } catch {
        setMsg({ tone: 'error', text: toVietnameseMessage('upload_failed') })
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
        className="clay-card flex max-w-[380px] flex-[1_1_280px] flex-col gap-2 p-[18px]"
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
              className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-panel border-2 px-3 py-1.5 text-left text-ink transition-colors hover:bg-primary-soft motion-reduce:transition-none ${
                on ? 'border-primary-strong bg-primary-soft' : 'border-edge bg-white'
              }`}
            >
              <AvatarImage avatar={av} size={46} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-extrabold">{p.name}</span>
                <span className="text-[13px] font-bold text-muted">{p.role}</span>
              </span>
              {on && <Icon d={ICONS.checkCircle} size={22} className="text-primary-strong" />}
            </button>
          )
        })}
      </section>

      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-4">
        <div
          data-testid="current"
          className="clay-card flex flex-wrap items-center gap-5 bg-primary-soft p-6"
        >
          <AvatarImage avatar={current?.avatar ?? null} size={150} />
          <div className="flex flex-[1_1_220px] flex-col gap-1.5">
            <div className="text-[13px] font-extrabold tracking-[0.1em] text-primary-deep">{person.role.toUpperCase()}</div>
            <div className="font-display text-[30px] font-extrabold leading-[1.1]">{person.name}</div>
            <div className="text-[15px] font-bold text-muted">
              Avatar hiện tại: {current?.label || 'Chưa chọn'}
            </div>
          </div>
        </div>

        <div className="clay-card flex flex-col gap-3.5 p-6">
          <div>
            <h2 className="m-0 font-display text-[22px] font-extrabold">Thư viện avatar của lớp</h2>
            <div className="text-sm font-semibold text-muted">
              Gồm các avatar có sẵn và avatar cô đã tải lên. Học sinh chỉ chọn được trong thư viện này.
            </div>
          </div>
          <div data-testid="library" className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3.5">
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
                  className={`clay-press relative flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-panel border-2 px-1.5 py-3 text-ink [--edge:var(--primary-edge)] ${
                    on ? 'border-primary-strong bg-primary-soft' : 'border-edge bg-white hover:bg-primary-soft'
                  }`}
                >
                  <AvatarImage avatar={a.avatar} size={96} />
                  <span className="text-[13px] font-extrabold">{a.label}</span>
                  {on && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary-strong text-white">
                      <Icon d={ICONS.check} size={14} />
                    </span>
                  )}
                </button>
              )
            })}
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-panel border-2 border-dashed border-primary bg-bg px-1.5 py-2.5 text-center text-[13px] font-extrabold text-primary-ink transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
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
            <Button size="lg" onClick={save} disabled={busy || !pendingId}>
              {busy && <Icon d="M21 12a9 9 0 1 1-6.2-8.6" size={18} className="motion-safe:animate-spin" />}
              Lưu avatar
            </Button>
          </div>
        </div>

        <div className="clay-card px-6 py-4">
          <Switch
            checked={allow}
            onChange={flipAllow}
            disabled={busy}
            label="Quyền đổi avatar của học sinh"
            hint="Khi bật, học sinh tự chọn avatar trong thư viện ở trang hồ sơ của mình. Khi tắt, chỉ cô được đổi."
          />
        </div>
      </div>
    </div>
  )
}
