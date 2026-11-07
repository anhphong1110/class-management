'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { toVietnameseMessage } from '@/lib/errors'
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '@/lib/students/import-limits'
import type { ImportRow } from '@/lib/students/import'
import { importStudents } from './actions'

export function ImportDialog({
  open,
  existingCodes,
  onClose,
  onDone,
}: {
  open: boolean
  existingCodes: Set<string>
  onClose: () => void
  onDone: (created: number) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Nhập danh sách học sinh">
      {/* key: dựng lại mỗi lần mở để không giữ file cũ */}
      <Body key={String(open)} existingCodes={existingCodes} onClose={onClose} onDone={onDone} />
    </Modal>
  )
}

function Body({ existingCodes, onClose, onDone }: { existingCodes: Set<string>; onClose: () => void; onDone: (n: number) => void }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const valid = (rows ?? []).filter((r) => !r.error)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError('')
    setRows(null)
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      setError('File lớn hơn 2 MB, cô chọn file nhỏ hơn nhé.')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setError('Chưa đọc được file này, cô thử lại nhé.')
    reader.onload = async () => {
      try {
        // Nạp bộ đọc file khi cần để xlsx không nằm trong gói tải đầu của trang.
        const { parseStudentSheet } = await import('@/lib/students/import')
        const { rows: parsed } = parseStudentSheet(reader.result as ArrayBuffer, existingCodes)
        if (parsed.length > MAX_IMPORT_ROWS) setError(`File có hơn ${MAX_IMPORT_ROWS} dòng, cô chia nhỏ file rồi nhập từng phần nhé.`)
        else if (parsed.length === 0) setError('File chưa có dòng học sinh nào.')
        else setRows(parsed)
      } catch (err) {
        setError(toVietnameseMessage(err instanceof Error ? err.message : 'unknown'))
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function submit() {
    setError('')
    startTransition(async () => {
      const res = await importStudents(valid.map((r) => ({ rollNo: r.rollNo, fullName: r.fullName, code: r.code })))
      if (res.error) setError(res.error)
      else onDone(res.created ?? valid.length)
    })
  }

  // Gom lỗi theo nội dung để nói gọn: "Thiếu họ và tên: dòng 3, 5".
  const invalid = (rows ?? []).filter((r) => r.error)
  const problems = new Map<string, number[]>()
  for (const r of invalid) problems.set(r.error as string, [...(problems.get(r.error as string) ?? []), r.line])

  const step = pending ? 3 : rows ? 2 : 1
  const stepLabel = ['Chọn file', 'Kiểm tra danh sách', 'Đang thêm học sinh'][step - 1]

  return (
    <div className="flex flex-col gap-4">
      <ProgressBar value={step} max={3} label={`Bước ${step} trên 3: ${stepLabel}`} />

      <div className="flex flex-col gap-2">
        <p className="m-0 text-[15px] font-semibold text-muted">
          <b className="text-ink">Bước 1.</b> Chọn file Excel (.xlsx, .xls) hoặc CSV gồm các cột Số thứ tự, Họ và tên, Mã học sinh. Để trống mã thì hệ thống tự sinh.{' '}
          <a href="/mau/mau-danh-sach-hoc-sinh.xlsx" download className="font-extrabold text-primary-ink underline">
            Tải file mẫu
          </a>
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label="Chọn file danh sách"
          onChange={onFile}
          disabled={pending}
          className="min-h-12 w-full rounded-ctl border-2 border-dashed border-edge bg-field p-2.5 text-[15px] font-semibold text-ink file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-chip file:border-0 file:bg-primary-strong file:px-4 file:font-extrabold file:text-white hover:border-primary"
        />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {rows && (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[15px] font-semibold text-muted">
            <b className="text-ink">Bước 2.</b> Cô xem lại danh sách rồi bấm thêm.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">
              <Icon d={ICONS.check} size={14} />
              {valid.length} dòng dùng được
            </Badge>
            {invalid.length > 0 ? (
              <Badge tone="danger">
                <Icon d={ICONS.alert} size={14} />
                {invalid.length} dòng cần sửa
              </Badge>
            ) : null}
          </div>
          {invalid.length > 0 ? (
            <Notice tone="info">
              <p className="m-0">Các dòng cần sửa sẽ được bỏ qua, cô có thể sửa file rồi chọn lại:</p>
              <ul className="m-0 mt-1 list-disc pl-5">
                {[...problems].map(([msg, lines]) => (
                  <li key={msg}>
                    {msg} (dòng {lines.join(', ')})
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
          <div className="max-h-[300px] overflow-auto rounded-ctl border-2 border-edge">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead>
                <tr className="bg-primary-soft text-primary-deep">
                  <th className="px-3 py-2">Dòng</th>
                  <th className="px-3 py-2">Số thứ tự</th>
                  <th className="px-3 py-2">Họ và tên</th>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.line}
                    data-testid="import-row"
                    data-invalid={r.error ? 'true' : 'false'}
                    className={`border-t border-edge font-semibold ${r.error ? 'bg-danger-soft text-danger-deep' : ''}`}
                  >
                    <td className="px-3 py-2">{r.line}</td>
                    <td className="px-3 py-2">{r.rollNo ?? '—'}</td>
                    <td className="px-3 py-2">{r.fullName || '—'}</td>
                    <td className="px-3 py-2">{r.code ?? 'Tự sinh'}</td>
                    <td className="px-3 py-2 font-extrabold">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon d={r.error ? ICONS.alert : ICONS.check} size={16} />
                        {r.error ?? 'Hợp lệ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={submit} disabled={pending || valid.length === 0}>
          {pending ? 'Đang thêm…' : `Thêm ${valid.length} học sinh`}
        </Button>
      </div>
    </div>
  )
}
