import { useRef, useState, type TransitionStartFunction } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { BACKUP_BUCKET, MAX_BACKUP_BYTES, type BackupSummary } from '@/lib/backup/format'
import { validateBackup } from '@/lib/backup/validate'
import { toVietnameseMessage } from '@/lib/errors'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { restoreBackup } from '../data-actions'
import { action, isRedirect } from './shared'

const RESTORE_NOTE =
  'Khôi phục sẽ tạo một năm học mới từ bản sao lưu và lưu trữ năm học hiện tại. Dữ liệu hiện tại không bị xóa. Học sinh cần được tạo lại tài khoản.'

type Preview = { file: File; summary: BackupSummary }

export function RestoreCard({
  classId,
  pending,
  startTransition,
  setError,
}: {
  classId: string
  pending: boolean
  startTransition: TransitionStartFunction
  setError: (e: string | null) => void
}) {
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

  return (
    <>
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
    </>
  )
}
