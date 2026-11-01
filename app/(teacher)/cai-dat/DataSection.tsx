'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { toVietnameseMessage } from '@/lib/errors'
import { BACKUP_BUCKET, MAX_BACKUP_BYTES, type BackupSummary } from '@/lib/backup/format'
import { validateBackup } from '@/lib/backup/validate'
import type { ArchivedClass } from '@/lib/backup/queries'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { COPY_OPTIONS, DEFAULT_COPY, nextSchoolYear, type CopyKey } from '@/lib/backup/year'
import { deleteDemoData, openNewYear, restoreBackup } from './data-actions'

const card =
  'flex flex-col gap-3.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'
const action =
  'flex min-h-24 cursor-pointer flex-col gap-1 rounded-[20px] border-2 border-[#E4E0F7] bg-[#F6F4FF] px-4 py-3.5 text-left text-ink no-underline disabled:cursor-not-allowed disabled:opacity-50'

const field = 'flex flex-col gap-1 text-sm font-extrabold text-[#4A476E]'
const fieldInput =
  'min-h-12 box-border rounded-xl border-2 border-[#D9D5F2] bg-white px-3.5 text-base font-bold text-ink disabled:opacity-50'

const NEW_YEAR_NOTE =
  'Năm học hiện tại được lưu trữ và năm mới bắt đầu từ 0 sao. Học sinh không được chép sang; các yêu cầu đổi quà đang chờ sẽ bị từ chối và sao được trả lại.'

const RESTORE_NOTE =
  'Khôi phục sẽ tạo một năm học mới từ bản sao lưu và lưu trữ năm học hiện tại. Dữ liệu hiện tại không bị xóa. Học sinh cần được tạo lại tài khoản.'

type Preview = { file: File; summary: BackupSummary }

/** Lỗi chuyển hướng của Server Action phải đi tiếp để trình duyệt chuyển trang, không được báo như lỗi thường. */
function isRedirect(e: unknown) {
  return typeof (e as { digest?: unknown })?.digest === 'string' && (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')
}

type Current = { schoolYear: string; className: string; teacherName: string }

export function DataSection({
  archived,
  classId,
  current,
  demoCount,
}: {
  archived: ArchivedClass[]
  classId: string
  current: Current
  demoCount: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [yearOpen, setYearOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [yearForm, setYearForm] = useState({ schoolYear: '', className: '', teacherName: '' })
  const [copy, setCopy] = useState<CopyKey[]>(DEFAULT_COPY)
  const [preview, setPreview] = useState<Preview | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const invalid = () => setError(toVietnameseMessage('invalid_backup'))

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.size > MAX_BACKUP_BYTES) return invalid()
    let json: unknown
    try {
      json = JSON.parse(await file.text())
    } catch {
      return invalid()
    }
    const check = validateBackup(json)
    if (!check.ok) return invalid()
    setPreview({ file, summary: check.summary })
  }

  function close() {
    if (pending) return
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function restore() {
    if (!preview) return
    const { file } = preview
    startTransition(async () => {
      try {
        // Tải thẳng lên Storage (không qua thân Server Action), rồi chỉ gửi đường dẫn.
        const path = `${classId}/${crypto.randomUUID()}.json`
        const up = await createBrowserSupabase().storage.from(BACKUP_BUCKET).upload(path, new Blob([file], { type: 'application/json' }), { contentType: 'application/json' })
        if (up.error) {
          setPreview(null)
          setError(toVietnameseMessage('unknown'))
          return
        }
        const res = await restoreBackup(path)
        if (res?.error) {
          setPreview(null)
          setError(res.error)
        }
      } catch (e) {
        if (isRedirect(e)) throw e
        setPreview(null)
        setError(toVietnameseMessage('unknown'))
      }
    })
  }

  function openYear() {
    setError(null)
    setDone(null)
    setYearForm({ schoolYear: nextSchoolYear(current.schoolYear), className: current.className, teacherName: current.teacherName })
    setCopy(DEFAULT_COPY)
    setYearOpen(true)
  }

  function closeYear() {
    if (!pending) setYearOpen(false)
  }

  function toggleCopy(key: CopyKey, on: boolean) {
    setCopy((prev) => {
      const next = on ? [...prev, key] : prev.filter((k) => k !== key)
      // Thời khóa biểu trỏ vào môn học: bỏ chọn Môn học thì bỏ cả Thời khóa biểu.
      return key === 'subjects' && !on ? next.filter((k) => k !== 'timetable') : next
    })
  }

  function submitYear(e: FormEvent) {
    e.preventDefault()
    if (pending || !yearForm.schoolYear.trim() || !yearForm.className.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await openNewYear({
          expected_class_id: classId,
          school_year: yearForm.schoolYear,
          class_name: yearForm.className,
          teacher_name: yearForm.teacherName,
          copy,
        })
        if (res?.error) {
          setYearOpen(false)
          setError(res.error)
        }
      } catch (err) {
        if (isRedirect(err)) throw err
        setYearOpen(false)
        setError(toVietnameseMessage('unknown'))
      }
    })
  }

  function closeDelete() {
    if (!pending) setDeleteOpen(false)
  }

  function removeDemo() {
    setError(null)
    setDone(null)
    startTransition(async () => {
      try {
        const res = await deleteDemoData()
        setDeleteOpen(false)
        if ('error' in res) setError(res.error)
        else setDone(res.message)
        router.refresh()
      } catch {
        setDeleteOpen(false)
        setError(toVietnameseMessage('unknown'))
      }
    })
  }

  return (
    <section className={card} aria-labelledby="data-h">
      <h2 id="data-h" className="m-0 font-display text-[22px] font-extrabold">
        Năm học và dữ liệu
      </h2>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <a href="/cai-dat/sao-luu" className={action}>
          <span className="text-base font-extrabold">Sao lưu dữ liệu</span>
          <span className="text-[13.5px] font-semibold leading-snug text-[#4A476E]">
            Tải bản sao lưu toàn bộ lớp (học sinh, sao, điểm danh, quà).
          </span>
        </a>
        <button type="button" className={action} disabled={pending} onClick={() => fileRef.current?.click()}>
          <span className="text-base font-extrabold">Khôi phục từ bản sao lưu</span>
          <span className="text-[13.5px] font-semibold leading-snug text-[#4A476E]">
            Chọn file sao lưu để quay lại dữ liệu cũ.
          </span>
        </button>
        <button
          type="button"
          className={`${action} !border-[#4F5BD5] !bg-[#EEF0FF]`}
          disabled={pending}
          onClick={openYear}
        >
          <span className="text-base font-extrabold text-[#2C37A8]">Lưu trữ năm học {current.schoolYear}</span>
          <span className="text-[13.5px] font-semibold leading-snug text-[#4A476E]">
            Đóng sổ năm học, mở năm mới mà không ghi đè lịch sử cũ.
          </span>
        </button>
        <button
          type="button"
          className={`${action} !border-[#C0314E] !bg-[#FFF4F7]`}
          disabled={pending || demoCount === 0}
          onClick={() => setDeleteOpen(true)}
        >
          <span className="text-base font-extrabold text-[#8E1B3B]">Xóa dữ liệu demo</span>
          <span className="text-[13.5px] font-semibold leading-snug text-[#4A476E]">
            {demoCount === 0
              ? 'Không còn dữ liệu demo.'
              : `Xóa ${demoCount} học sinh mẫu để nhập danh sách thật. Cần xác nhận.`}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          data-testid="restore-file"
          aria-hidden="true"
          tabIndex={-1}
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>

      {archived.length > 0 && (
        <>
          <h3 className="m-0 mt-1 font-display text-lg font-extrabold">Các năm học đã lưu trữ</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {archived.map((c) => (
              <li
                key={c.id}
                aria-label={`${c.className} · ${c.schoolYear}`}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] bg-[#F6F4FF] px-3.5 py-1.5"
              >
                <span className="text-[15px] font-extrabold">
                  {c.className} · {c.schoolYear}
                </span>
                <a
                  href={`/cai-dat/sao-luu?lop=${c.id}`}
                  className="inline-flex min-h-11 items-center rounded-[14px] border-2 border-primary-strong bg-white px-5 font-extrabold text-primary-strong no-underline hover:bg-bg"
                >
                  Tải sao lưu
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={yearOpen} onClose={closeYear} title="Mở năm học mới">
        <form onSubmit={submitYear} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <label className={field}>
            Năm học
            <input
              className={fieldInput}
              value={yearForm.schoolYear}
              onChange={(e) => setYearForm((f) => ({ ...f, schoolYear: e.target.value }))}
              disabled={pending}
              required
              maxLength={100}
            />
          </label>
          <label className={field}>
            Tên lớp
            <input
              className={fieldInput}
              value={yearForm.className}
              onChange={(e) => setYearForm((f) => ({ ...f, className: e.target.value }))}
              disabled={pending}
              required
              maxLength={100}
            />
          </label>
          <label className={field}>
            Giáo viên chủ nhiệm
            <input
              className={fieldInput}
              value={yearForm.teacherName}
              onChange={(e) => setYearForm((f) => ({ ...f, teacherName: e.target.value }))}
              disabled={pending}
              maxLength={100}
            />
          </label>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 p-0 text-sm font-extrabold text-[#4A476E]">Chép sang năm mới</legend>
            {COPY_OPTIONS.map((o) => (
              <label key={o.key} className="flex min-h-11 items-center gap-2.5 text-[15px] font-bold">
                <input
                  type="checkbox"
                  className="size-5 accent-[#4F5BD5]"
                  checked={copy.includes(o.key)}
                  disabled={pending || (o.key === 'timetable' && !copy.includes('subjects'))}
                  onChange={(e) => toggleCopy(o.key, e.target.checked)}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <p className="m-0 text-[14px] text-muted">{NEW_YEAR_NOTE}</p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={closeYear} disabled={pending}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending || !yearForm.schoolYear.trim() || !yearForm.className.trim()}>
              Lưu trữ và mở năm mới
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={closeDelete}
        title={`Xóa toàn bộ dữ liệu mẫu (${demoCount} học sinh mẫu và dữ liệu đi kèm)? Không hoàn tác được.`}
      >
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={closeDelete} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={removeDemo} disabled={pending}>
            Xóa dữ liệu demo
          </Button>
        </div>
      </Modal>

      <Modal open={preview !== null} onClose={close} title="Khôi phục từ bản sao lưu">
        {preview && (
          <div className="flex flex-col gap-3">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
              <dt className="font-bold text-[#4A476E]">Tên lớp</dt>
              <dd className="m-0 font-extrabold">{preview.summary.className}</dd>
              <dt className="font-bold text-[#4A476E]">Năm học</dt>
              <dd className="m-0 font-extrabold">{preview.summary.schoolYear}</dd>
              <dt className="font-bold text-[#4A476E]">Số học sinh</dt>
              <dd className="m-0 font-extrabold">{preview.summary.counts.students ?? 0}</dd>
              <dt className="font-bold text-[#4A476E]">Số giao dịch sao</dt>
              <dd className="m-0 font-extrabold">{preview.summary.counts.star_transactions ?? 0}</dd>
            </dl>
            <p className="m-0 text-[14px] text-muted">{RESTORE_NOTE}</p>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={close} disabled={pending}>
                Hủy
              </Button>
              <Button onClick={restore} disabled={pending}>
                Khôi phục
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
