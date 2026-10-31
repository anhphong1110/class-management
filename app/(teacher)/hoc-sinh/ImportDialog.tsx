'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
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

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[14.5px] font-semibold text-[#4A476E]">
        Chọn file Excel (.xlsx, .xls) hoặc CSV gồm các cột Số thứ tự, Họ và tên, Mã học sinh. Để trống mã thì hệ thống tự sinh.{' '}
        <a href="/mau/mau-danh-sach-hoc-sinh.xlsx" download className="font-extrabold text-[#3441B5] underline">
          Tải file mẫu
        </a>
      </p>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        aria-label="Chọn file danh sách"
        onChange={onFile}
        disabled={pending}
        className="min-h-12 w-full rounded-[14px] border-2 border-[#D9D5F2] bg-white p-2.5 text-[15px] font-semibold"
      />
      {error && <Notice tone="error">{error}</Notice>}
      {rows && (
        <div className="max-h-[320px] overflow-auto rounded-[14px] border-2 border-[#D9D5F2]">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-[#F0EEFA] text-[#4A476E]">
                <th className="px-3 py-2">Dòng</th>
                <th className="px-3 py-2">Số thứ tự</th>
                <th className="px-3 py-2">Họ và tên</th>
                <th className="px-3 py-2">Mã</th>
                <th className="px-3 py-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.line} data-testid="import-row" data-invalid={r.error ? 'true' : 'false'} style={r.error ? { background: '#FFE3EA', color: '#8E1B3B' } : undefined} className="border-t border-[#EEEBFA] font-semibold">
                  <td className="px-3 py-2">{r.line}</td>
                  <td className="px-3 py-2">{r.rollNo ?? '—'}</td>
                  <td className="px-3 py-2">{r.fullName || '—'}</td>
                  <td className="px-3 py-2">{r.code ?? 'Tự sinh'}</td>
                  <td className="px-3 py-2 font-extrabold">{r.error ?? 'Hợp lệ'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button onClick={submit} disabled={pending || valid.length === 0}>
          Thêm {valid.length} học sinh
        </Button>
      </div>
    </div>
  )
}
