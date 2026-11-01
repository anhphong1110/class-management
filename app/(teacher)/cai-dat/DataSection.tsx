'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { toVietnameseMessage } from '@/lib/errors'
import { MAX_BACKUP_BYTES, type BackupSummary } from '@/lib/backup/format'
import { validateBackup } from '@/lib/backup/validate'
import type { ArchivedClass } from '@/lib/backup/queries'
import { restoreBackup } from './data-actions'

const card =
  'flex flex-col gap-3.5 rounded-[26px] bg-white px-6 py-[22px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'
const action =
  'flex min-h-24 cursor-pointer flex-col gap-1 rounded-[20px] border-2 border-[#E4E0F7] bg-[#F6F4FF] px-4 py-3.5 text-left text-ink no-underline disabled:cursor-not-allowed disabled:opacity-50'

const RESTORE_NOTE =
  'Khôi phục sẽ tạo một năm học mới từ bản sao lưu và lưu trữ năm học hiện tại. Dữ liệu hiện tại không bị xóa. Học sinh cần được tạo lại tài khoản.'

type Preview = { file: File; summary: BackupSummary }

/** Lỗi chuyển hướng của Server Action phải đi tiếp để trình duyệt chuyển trang, không được báo như lỗi thường. */
function isRedirect(e: unknown) {
  return typeof (e as { digest?: unknown })?.digest === 'string' && (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')
}

export function DataSection({ archived }: { archived: ArchivedClass[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
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
    const form = new FormData()
    form.set('file', preview.file)
    startTransition(async () => {
      try {
        const res = await restoreBackup(form)
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

  return (
    <section className={card} aria-labelledby="data-h">
      <h2 id="data-h" className="m-0 font-display text-[22px] font-extrabold">
        Năm học và dữ liệu
      </h2>
      {error && <Notice tone="error">{error}</Notice>}
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
