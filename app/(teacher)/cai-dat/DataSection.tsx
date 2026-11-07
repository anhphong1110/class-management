'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { toVietnameseMessage } from '@/lib/errors'
import { BACKUP_BUCKET, MAX_BACKUP_BYTES, type BackupSummary } from '@/lib/backup/format'
import { validateBackup } from '@/lib/backup/validate'
import type { ArchivedClass } from '@/lib/backup/queries'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { COPY_OPTIONS, DEFAULT_COPY, nextSchoolYear, type CopyKey } from '@/lib/backup/year'
import { deleteDemoData, openNewYear, restoreBackup } from './data-actions'

const card = 'clay-card flex flex-col gap-3.5 px-6 py-[22px]'
const action =
  'clay-press flex min-h-24 cursor-pointer flex-col gap-1 rounded-panel border-2 border-edge bg-field px-4 py-3.5 text-left text-ink no-underline [--edge:var(--primary-edge)] hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50'

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
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deleteSure, setDeleteSure] = useState(false)
  const [archiveAsk, setArchiveAsk] = useState(false)
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

  function openDelete() {
    setDeleteStep(1)
    setDeleteSure(false)
    setDeleteOpen(true)
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

      <h3 className="m-0 font-display text-lg font-extrabold">Sao lưu và khôi phục</h3>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <a href="/cai-dat/sao-luu" className={action}>
          <span className="flex items-center gap-2 text-base font-extrabold">
            <Icon d="M12 4v12M7 11l5 5 5-5M4 20h16" size={20} className="text-primary-ink" />
            Sao lưu dữ liệu
          </span>
          <span className="text-sm font-semibold leading-snug text-muted">
            Tải bản sao lưu toàn bộ lớp (học sinh, sao, điểm danh, quà).
          </span>
        </a>
        <button type="button" className={action} disabled={pending} onClick={() => fileRef.current?.click()}>
          <span className="flex items-center gap-2 text-base font-extrabold">
            <Icon d="M12 16V4M7 9l5-5 5 5M4 20h16" size={20} className="text-primary-ink" />
            Khôi phục từ bản sao lưu
          </span>
          <span className="text-sm font-semibold leading-snug text-muted">
            Chọn file sao lưu để quay lại dữ liệu cũ.
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
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-ctl border-2 border-edge bg-field px-3.5 py-1.5"
              >
                <span className="text-[15px] font-extrabold">
                  {c.className} · {c.schoolYear}
                </span>
                <a
                  href={`/cai-dat/sao-luu?lop=${c.id}`}
                  className="inline-flex min-h-11 items-center rounded-ctl border-2 border-primary-strong bg-white px-5 font-extrabold text-primary-strong no-underline hover:bg-primary-soft"
                >
                  Tải sao lưu
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-2 flex flex-col gap-3 rounded-panel border-2 border-danger bg-danger-soft/40 p-4">
        <h3 className="m-0 flex items-center gap-2 font-display text-lg font-extrabold text-danger-deep">
          <Icon d={ICONS.alert} size={22} />
          Khu vực nguy hiểm
        </h3>
        <p className="m-0 text-sm font-semibold text-muted">
          Những việc dưới đây khó hoặc không thể hoàn tác. Cô nên tải bản sao lưu trước khi làm.
        </p>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <button
            type="button"
            className={`${action} !border-primary-strong !bg-primary-soft`}
            disabled={pending}
            onClick={() => setArchiveAsk(true)}
          >
            <span className="text-base font-extrabold text-primary-deep">Lưu trữ năm học {current.schoolYear}</span>
            <span className="text-sm font-semibold leading-snug text-muted">
              Đóng sổ năm học, mở năm mới mà không ghi đè lịch sử cũ.
            </span>
          </button>
          <button
            type="button"
            className={`${action} !border-danger !bg-white`}
            disabled={pending || demoCount === 0}
            onClick={openDelete}
          >
            <span className="text-base font-extrabold text-danger-deep">Xóa dữ liệu demo</span>
            <span className="text-sm font-semibold leading-snug text-muted">
              {demoCount === 0
                ? 'Không còn dữ liệu demo.'
                : `Xóa ${demoCount} học sinh mẫu để nhập danh sách thật. Cần xác nhận.`}
            </span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={archiveAsk}
        title="Lưu trữ năm học này?"
        message={`Năm học ${current.schoolYear} sẽ được đóng sổ và một năm học mới được mở. Cô sẽ chọn dữ liệu chép sang ở bước sau.`}
        confirmLabel="Tiếp tục"
        cancelLabel="Để sau"
        danger
        onCancel={() => setArchiveAsk(false)}
        onConfirm={() => {
          setArchiveAsk(false)
          openYear()
        }}
      />

      <Modal open={yearOpen} onClose={closeYear} title="Mở năm học mới">
        <form onSubmit={submitYear} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <Field label="Năm học">
            {(a) => (
              <Input
                {...a}
                value={yearForm.schoolYear}
                onChange={(e) => setYearForm((f) => ({ ...f, schoolYear: e.target.value }))}
                disabled={pending}
                required
                maxLength={100}
              />
            )}
          </Field>
          <Field label="Tên lớp">
            {(a) => (
              <Input
                {...a}
                value={yearForm.className}
                onChange={(e) => setYearForm((f) => ({ ...f, className: e.target.value }))}
                disabled={pending}
                required
                maxLength={100}
              />
            )}
          </Field>
          <Field label="Giáo viên chủ nhiệm">
            {(a) => (
              <Input
                {...a}
                value={yearForm.teacherName}
                onChange={(e) => setYearForm((f) => ({ ...f, teacherName: e.target.value }))}
                disabled={pending}
                maxLength={100}
              />
            )}
          </Field>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 p-0 text-[15px] font-extrabold text-ink">Chép sang năm mới</legend>
            {COPY_OPTIONS.map((o) => (
              <label key={o.key} className="flex min-h-11 items-center gap-2.5 text-[15px] font-bold">
                <input
                  type="checkbox"
                  className="size-5 accent-primary-strong"
                  checked={copy.includes(o.key)}
                  disabled={pending || (o.key === 'timetable' && !copy.includes('subjects'))}
                  onChange={(e) => toggleCopy(o.key, e.target.checked)}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <p className="m-0 text-sm font-semibold text-muted">{NEW_YEAR_NOTE}</p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={closeYear} disabled={pending}>
              Hủy
            </Button>
            <Button type="submit" loading={pending} disabled={!yearForm.schoolYear.trim() || !yearForm.className.trim()}>
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
        {deleteStep === 1 ? (
          <div className="flex flex-col gap-4">
            <p className="m-0 flex items-start gap-3 text-base font-semibold text-muted">
              <Icon d={ICONS.alert} size={22} className="mt-0.5 text-danger" />
              <span>Học sinh mẫu, sao, điểm danh và các dữ liệu đi kèm sẽ bị xóa. Học sinh thật cô đã nhập không bị ảnh hưởng.</span>
            </p>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={closeDelete} disabled={pending}>
                Hủy
              </Button>
              <Button variant="danger" onClick={() => setDeleteStep(2)} disabled={pending}>
                Tiếp tục
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex min-h-11 items-start gap-2.5 text-[15px] font-bold">
              <input
                type="checkbox"
                className="mt-0.5 size-5 accent-danger"
                checked={deleteSure}
                disabled={pending}
                onChange={(e) => setDeleteSure(e.target.checked)}
              />
              Cô hiểu việc này không hoàn tác được.
            </label>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setDeleteStep(1)} disabled={pending}>
                Quay lại
              </Button>
              <Button variant="danger" onClick={removeDemo} loading={pending} disabled={!deleteSure}>
                Xóa dữ liệu demo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={preview !== null} onClose={close} title="Khôi phục từ bản sao lưu">
        {preview && (
          <div className="flex flex-col gap-3">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
              <dt className="font-bold text-muted">Tên lớp</dt>
              <dd className="m-0 font-extrabold">{preview.summary.className}</dd>
              <dt className="font-bold text-muted">Năm học</dt>
              <dd className="m-0 font-extrabold">{preview.summary.schoolYear}</dd>
              <dt className="font-bold text-muted">Số học sinh</dt>
              <dd className="m-0 font-extrabold">{preview.summary.counts.students ?? 0}</dd>
              <dt className="font-bold text-muted">Số giao dịch sao</dt>
              <dd className="m-0 font-extrabold">{preview.summary.counts.star_transactions ?? 0}</dd>
            </dl>
            <p className="m-0 text-sm font-semibold text-muted">{RESTORE_NOTE}</p>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={close} disabled={pending}>
                Hủy
              </Button>
              <Button onClick={restore} loading={pending}>
                Khôi phục
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
