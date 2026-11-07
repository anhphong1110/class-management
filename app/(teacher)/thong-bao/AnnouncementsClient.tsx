'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
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

const PIN = 'M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z'

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
  const [deleting, setDeleting] = useState<AnnouncementView | null>(null)
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

  function confirmRemove() {
    const n = deleting
    if (!n) return
    setDeleting(null)
    if (editId === n.id) resetForm()
    run(() => archiveAnnouncement(n.id))
  }

  return (
    <>
      <div ref={formRef}>
        <Card className="flex flex-col gap-4">
          <h2 className="m-0 font-display text-[22px] font-extrabold">{editId ? 'Sửa thông báo' : 'Đăng thông báo mới'}</h2>
          <fieldset className="m-0 flex flex-col gap-3 rounded-ctl border-2 border-edge px-4 pb-4 pt-2">
            <legend className="px-2 text-sm font-extrabold text-primary-deep">Nội dung thông báo</legend>
            <div className="flex flex-wrap gap-3">
              <Field label="Tiêu đề" className="flex-[2_1_260px]">
                {(a) => (
                  <Input
                    {...a}
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
                  />
                )}
              </Field>
              <Field label="Loại" className="flex-[1_1_180px]">
                {(a) => (
                  <Select {...a} value={type} disabled={busy} onChange={(e) => setType(e.target.value)}>
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Nội dung">
              {(a) => (
                <Textarea
                  {...a}
                  rows={3}
                  value={body}
                  maxLength={2000}
                  disabled={busy}
                  placeholder="Cô viết nội dung thông báo ở đây"
                  className="resize-y"
                  onChange={(e) => {
                    setBody(e.target.value)
                    setErr('')
                  }}
                />
              )}
            </Field>
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-3 rounded-ctl border-2 border-edge px-4 pb-4 pt-2">
            <legend className="px-2 text-sm font-extrabold text-primary-deep">Hình ảnh và ghim</legend>
            {shownImage && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownImage} alt="Hình đính kèm" className="h-20 w-32 rounded-xl object-cover" />
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setClearImage(true)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  Bỏ hình
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" className="border-dashed" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Icon d={ICONS.plus} size={18} />
                Đính kèm hình ảnh
              </Button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="flex items-center rounded-ctl border-2 border-edge bg-field px-4">
                <Switch checked={pinned} onChange={setPinned} label="Ghim lên đầu" disabled={busy} />
              </div>
            </div>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2.5">
            {editId && (
              <Button variant="secondary" size="lg" disabled={busy} onClick={cancelEdit}>
                Hủy sửa
              </Button>
            )}
            <Button size="lg" loading={busy} onClick={submit}>
              {editId ? 'Lưu thay đổi' : 'Đăng thông báo'}
            </Button>
          </div>
          {err && <Notice tone="error">{err}</Notice>}
          {msg && <Notice tone="success">{msg}</Notice>}
        </Card>
      </div>

      <div className="flex flex-col gap-3.5">
        {items.length === 0 && (
          <EmptyState title="Chưa có thông báo nào" icon={ICONS.bell}>
            Cô đăng thông báo đầu tiên ở phía trên để cả lớp cùng xem nhé.
          </EmptyState>
        )}
        {items.map((n) => {
          const [tint, ink] = announcementColors(n.type)
          return (
            <article
              key={n.id}
              data-testid="announcement-card"
              className={`clay-card flex flex-col gap-2 px-6 py-5 ${n.pinned ? '[--primary-edge:#FFD65E]' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {n.type && (
                    <span className="rounded-full px-3 py-[3px] text-[13px] font-extrabold" style={{ background: tint, color: ink }}>
                      {n.type}
                    </span>
                  )}
                  <span className="text-[13px] font-semibold text-muted">{formatDayLabel(new Date(n.publishedAt), nowDate)}</span>
                  {n.pinned && (
                    <Badge tone="star">
                      <Icon d={PIN} size={14} />
                      Đang ghim
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="secondary" disabled={busy} onClick={() => run(() => togglePin(n.id, !n.pinned))}>
                    <Icon d={PIN} size={16} />
                    {n.pinned ? 'Bỏ ghim' : 'Ghim'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => startEdit(n)}>
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setDeleting(n)}
                    className="text-danger-deep hover:!bg-danger-soft hover:!text-danger-deep"
                  >
                    <Icon d={ICONS.trash} size={16} />
                    Xóa
                  </Button>
                </div>
              </div>
              <h3 className="m-0 font-display text-[21px] font-extrabold">{n.title}</h3>
              <div className="whitespace-pre-line text-base leading-normal text-muted">{n.body}</div>
              {n.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.imageUrl} alt={n.title} className="max-h-72 w-full rounded-2xl object-cover" />
              )}
            </article>
          )
        })}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa thông báo này?"
        message={deleting ? `Thông báo "${deleting.title}" sẽ biến mất khỏi trang của học sinh.` : ''}
        confirmLabel="Xóa thông báo"
        danger
        pending={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmRemove}
      />
    </>
  )
}
