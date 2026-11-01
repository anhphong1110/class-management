'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { compressImage } from '@/lib/domain/compress-image'
import { formatDayLabel } from '@/lib/domain/relative-time'
import { MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'
import { toVietnameseMessage } from '@/lib/errors'
import { ANNOUNCEMENT_TYPES, announcementColors, type AnnouncementView } from '@/lib/announcements/types'
import {
  archiveAnnouncement,
  removeAnnouncementImage,
  saveAnnouncement,
  togglePin,
  uploadAnnouncementImage,
} from './actions'

type Result = { error?: string; message?: string }

const field = 'min-h-12 box-border rounded-xl border-2 border-[#D9D5F2] bg-white px-3.5 text-base font-bold text-ink'
const ghost =
  'min-h-11 cursor-pointer rounded-xl border-[1.5px] border-[#D9D5F2] bg-white px-3.5 text-[13.5px] font-extrabold text-primary-ink disabled:cursor-not-allowed disabled:opacity-50'

export function AnnouncementsClient({ items, now }: { items: AnnouncementView[]; now: string }) {
  const nowDate = new Date(now)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<string>(ANNOUNCEMENT_TYPES[0])
  const [pinned, setPinned] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const editing = editId ? (items.find((n) => n.id === editId) ?? null) : null
  const existingImage = editing && !clearImage ? editing.imageUrl : null
  const shownImage = preview ?? existingImage

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function resetForm() {
    setEditId(null)
    setTitle('')
    setBody('')
    setType(ANNOUNCEMENT_TYPES[0])
    setPinned(false)
    setFile(null)
    setPreview(null)
    setClearImage(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onFile(f: File | undefined) {
    if (!f) return
    // Chỉ kiểm loại ở đây; kích thước kiểm sau khi nén (ảnh chụp điện thoại thường lớn).
    const check = validateImageFile({ size: 0, type: f.type })
    if (!check.ok) {
      setErr(toVietnameseMessage(check.error))
      setMsg('')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setErr('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setClearImage(false)
  }

  function startEdit(n: AnnouncementView) {
    setConfirmDel(null)
    setEditId(n.id)
    setTitle(n.title)
    setBody(n.body)
    setType(n.type)
    setPinned(n.pinned)
    setFile(null)
    setPreview(null)
    setClearImage(false)
    setErr('')
    setMsg('')
    if (fileRef.current) fileRef.current.value = ''
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    titleRef.current?.focus({ preventScroll: true })
  }

  function cancelEdit() {
    resetForm()
    setErr('')
    setMsg('')
  }

  function submit() {
    setConfirmDel(null)
    if (!title.trim() || !body.trim()) {
      setErr(toVietnameseMessage('announcement_required'))
      setMsg('')
      return
    }
    startTransition(async () => {
      try {
        const res = await saveAnnouncement({ id: editId ?? undefined, title, body, type, pinned })
        if (res.error || !res.id) {
          setErr(res.error ?? toVietnameseMessage('invalid_input'))
          setMsg('')
          return
        }
        const id = res.id
        const saved = res.message ?? ''
        const partial = (why: string) => {
          // Nội dung đã lưu; chỉ phần ảnh lỗi. Đóng form để bấm lại không đăng thêm bản nữa.
          resetForm()
          setMsg('')
          setErr(`${saved.replace(/\.$/, '')}; ${why}`)
        }
        if (editId && clearImage && !file) {
          const rm = await removeAnnouncementImage(id)
          if (rm.error) return partial(rm.error)
        }
        if (file) {
          let small: File
          try {
            small = await compressImage(file, 1280)
          } catch {
            return partial(toVietnameseMessage('upload_failed'))
          }
          const check = validateImageFile(small, MAX_UPLOAD_BYTES)
          if (!check.ok) return partial(toVietnameseMessage(check.error))
          try {
            const form = new FormData()
            form.set('file', small)
            const up = await uploadAnnouncementImage(id, form)
            if (up.error) return partial(up.error)
          } catch {
            return partial(toVietnameseMessage('upload_failed'))
          }
        }
        resetForm()
        setErr('')
        setMsg(saved)
      } catch {
        setErr(toVietnameseMessage('unknown'))
        setMsg('')
      }
    })
  }

  function run(task: () => Promise<Result>) {
    startTransition(async () => {
      try {
        const res = await task()
        if (res.error) {
          setErr(res.error)
          setMsg('')
        } else if (res.message) {
          setErr('')
          setMsg(res.message)
        }
      } catch {
        setErr(toVietnameseMessage('unknown'))
        setMsg('')
      }
    })
  }

  function remove(id: string) {
    if (confirmDel !== id) {
      setConfirmDel(id)
      return
    }
    setConfirmDel(null)
    if (editId === id) resetForm()
    run(() => archiveAnnouncement(id))
  }

  return (
    <>
      <div ref={formRef} className="flex flex-col gap-3 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <h2 className="m-0 font-display text-[22px] font-extrabold">{editId ? 'Sửa thông báo' : 'Đăng thông báo mới'}</h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-[2_1_260px] flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
            Tiêu đề
            <input
              ref={titleRef}
              type="text"
              value={title}
              maxLength={120}
              disabled={busy}
              placeholder="Ví dụ: Nhắc bài Toán"
              onChange={(e) => {
                setTitle(e.target.value)
                setErr('')
              }}
              className={field}
            />
          </label>
          <label className="flex flex-[1_1_180px] flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
            Loại
            <select value={type} disabled={busy} onChange={(e) => setType(e.target.value)} className={`${field} px-3`}>
              {ANNOUNCEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-extrabold text-[#4A476E]">
          Nội dung
          <textarea
            rows={3}
            value={body}
            maxLength={2000}
            disabled={busy}
            placeholder="Cô viết nội dung thông báo ở đây"
            onChange={(e) => {
              setBody(e.target.value)
              setErr('')
            }}
            className="box-border resize-y rounded-xl border-2 border-[#D9D5F2] bg-white px-3.5 py-3 text-base font-semibold text-ink"
          />
        </label>
        {shownImage && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownImage} alt="Hình đính kèm" className="h-20 w-32 rounded-xl object-cover" />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFile(null)
                setPreview(null)
                setClearImage(true)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className={ghost}
            >
              Bỏ hình
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="min-h-12 cursor-pointer rounded-[14px] border-2 border-dashed border-[#8E86D8] bg-[#F6F4FF] px-4 text-sm font-extrabold text-primary-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đính kèm hình ảnh
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <div className="flex items-center rounded-[14px] border-2 border-[#D9D5F2] bg-white px-4">
              <Switch checked={pinned} onChange={setPinned} label="Ghim lên đầu" disabled={busy} />
            </div>
          </div>
          <div className="flex gap-2.5">
            {editId && (
              <button
                type="button"
                disabled={busy}
                onClick={cancelEdit}
                className="min-h-[52px] cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-5 font-extrabold text-[#4A476E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy sửa
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="min-h-[52px] cursor-pointer rounded-[14px] border-0 bg-primary-strong px-7 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editId ? 'Lưu thay đổi' : 'Đăng thông báo'}
            </button>
          </div>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
        {msg && <Notice tone="success">{msg}</Notice>}
      </div>

      <div className="flex flex-col gap-3.5">
        {items.map((n) => {
          const [tint, ink] = announcementColors(n.type)
          const asking = confirmDel === n.id
          return (
            <article
              key={n.id}
              data-testid="announcement-card"
              className="flex flex-col gap-2 rounded-3xl border-2 bg-white px-6 py-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]"
              style={{ borderColor: n.pinned ? '#FFC857' : 'transparent' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {n.type && (
                    <span className="rounded-full px-3 py-[3px] text-[12.5px] font-extrabold" style={{ background: tint, color: ink }}>
                      {n.type}
                    </span>
                  )}
                  <span className="text-[13px] text-[#5B5890]">{formatDayLabel(new Date(n.publishedAt), nowDate)}</span>
                  {n.pinned && <span className="text-[12.5px] font-extrabold text-[#7A4E00]">Đang ghim</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setConfirmDel(null)
                      run(() => togglePin(n.id, !n.pinned))
                    }}
                    className={ghost}
                  >
                    {n.pinned ? 'Bỏ ghim' : 'Ghim'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => startEdit(n)} className={ghost}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(n.id)}
                    className="min-h-11 cursor-pointer rounded-xl border-[1.5px] px-3.5 text-[13.5px] font-extrabold text-[#A22441] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: asking ? '#C0314E' : '#D9D5F2', background: asking ? '#FFE3EA' : '#fff' }}
                  >
                    {asking ? 'Bấm lần nữa để xóa' : 'Xóa'}
                  </button>
                </div>
              </div>
              <h3 className="m-0 font-display text-[21px] font-extrabold">{n.title}</h3>
              <div className="whitespace-pre-line text-[15px] leading-normal text-[#4A476E]">{n.body}</div>
              {n.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.imageUrl} alt={n.title} className="max-h-72 w-full rounded-2xl object-cover" />
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
