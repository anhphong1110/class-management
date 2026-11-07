'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { givenNameKey, matchesSearch } from '@/lib/domain/vn-text'
import type { StarGroup } from '@/lib/stars/queries'
import type { StudentCard, TodayStatus } from '@/lib/students/queries'
import { archiveStudent, deleteStudent, exportStudents, loadProfile, type ProfileDetail } from './actions'
import { CLOCK, X_CIRCLE } from '../diem-danh/status-icons'
import { GroupsView } from './GroupsView'
import { ImportDialog } from './ImportDialog'
import { ProfilePanel } from './ProfilePanel'
import { StudentForm, type EditTarget } from './StudentForm'

type Sort = 'name' | 'stars' | 'no'
type Filter = 'all' | 'present' | 'absent' | 'late'
type View = 'all' | 'groups'

// [nhãn, lớp màu, icon]: luôn có chữ và icon, không chỉ dựa vào màu.
const TODAY: Record<NonNullable<TodayStatus> | 'none', [string, string, string]> = {
  present: ['Có mặt', 'bg-success-soft text-success-deep', ICONS.checkCircle],
  late: ['Đi trễ', 'bg-star-soft text-star-ink', CLOCK],
  absent_excused: ['Vắng có phép', 'bg-primary-soft text-primary-deep', ICONS.calendar],
  absent_unexcused: ['Vắng', 'bg-danger-soft text-danger-deep', X_CIRCLE],
  none: ['Chưa điểm danh', 'bg-[#F0EEFA] text-muted', ICONS.minus],
}

const FILTERS: [Filter, string][] = [
  ['all', 'Tất cả'],
  ['present', 'Có mặt hôm nay'],
  ['absent', 'Vắng hôm nay'],
  ['late', 'Đi trễ'],
]
const VIEWS: [View, string][] = [
  ['all', 'Tất cả học sinh'],
  ['groups', 'Chia tổ'],
]

const ROLE_LABEL = { leader: 'Tổ trưởng', deputy: 'Tổ phó', member: '' } as const
const pill = (on: boolean) =>
  `inline-flex cursor-pointer items-center justify-center gap-1.5 border-2 font-extrabold transition-colors ${
    on
      ? 'border-primary-strong bg-primary-strong text-white'
      : 'border-edge bg-white text-primary-deep hover:bg-primary-soft'
  }`

function groupLabel(s: StudentCard): string {
  if (!s.groupName) return 'Chưa có tổ'
  const role = s.groupRole ? ROLE_LABEL[s.groupRole] : ''
  return role ? `${s.groupName} · ${role}` : s.groupName
}

export function StudentsClient({ students, groups, allCodes }: { students: StudentCard[]; groups: StarGroup[]; allCodes: string[] }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View>('all')
  const [selId, setSelId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ id: string; data: ProfileDetail | null; failed: boolean } | null>(null)
  const [form, setForm] = useState<{ open: boolean; student: EditTarget | null }>({ open: false, student: null })
  const [confirming, setConfirming] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, startExport] = useTransition()
  const [pending, startTransition] = useTransition()

  const list = useMemo(() => {
    let out = students.filter((s) => matchesSearch(q, [s.fullName, s.code]))
    if (filter === 'present') out = out.filter((s) => s.today === 'present' || s.today === 'late')
    if (filter === 'absent') out = out.filter((s) => s.today === 'absent_excused' || s.today === 'absent_unexcused')
    if (filter === 'late') out = out.filter((s) => s.today === 'late')
    if (sort === 'name') out = [...out].sort((a, b) => givenNameKey(a.fullName).localeCompare(givenNameKey(b.fullName), 'vi'))
    if (sort === 'stars') out = [...out].sort((a, b) => b.competition - a.competition || a.rollNo - b.rollNo)
    if (sort === 'no') out = [...out].sort((a, b) => a.rollNo - b.rollNo)
    return out
  }, [students, q, sort, filter])

  const existingCodes = useMemo(() => new Set(allCodes), [allCodes])
  const sel = students.find((s) => s.id === selId) ?? null

  useEffect(() => {
    if (!selId) return
    let live = true
    loadProfile(selId).then(
      (res) => live && setDetail({ id: selId, data: res.detail ?? null, failed: !res.detail }),
      () => live && setDetail({ id: selId, data: null, failed: true }),
    )
    return () => {
      live = false
    }
  }, [selId, students])

  const current = detail && detail.id === selId ? detail : null

  function confirmArchive() {
    if (!sel) return
    setNotice('')
    startTransition(async () => {
      const res = await archiveStudent(sel.id)
      if (res.error) setError(res.error)
      else {
        setConfirming(false)
        setSelId(null)
        setError('')
        setNotice('Đã lưu trữ học sinh. Sổ sao và lịch sử vẫn được giữ lại.')
      }
    })
  }

  function confirmDelete() {
    if (!sel) return
    startTransition(async () => {
      const res = await deleteStudent(sel.id)
      if (res.error) setError(res.error)
      else {
        setConfirmingDelete(false)
        setSelId(null)
        setError('')
      }
    })
  }

  function exportFile() {
    setError('')
    setNotice('')
    startExport(async () => {
      const res = await exportStudents()
      if (res.error || !res.base64 || !res.fileName) {
        setError(res.error ?? 'Có lỗi xảy ra, vui lòng thử lại.')
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="clay-card flex flex-col gap-4 px-6 py-5">
        <div className="relative">
          <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4" size={24} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc mã học sinh"
            aria-label="Tìm học sinh"
            className="!min-h-14 !pl-13 text-lg"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-extrabold text-muted">
            Sắp xếp
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sắp xếp" className="!w-auto">
              <option value="name">Theo tên (A–Z)</option>
              <option value="stars">Theo số sao</option>
              <option value="no">Theo số thứ tự</option>
            </Select>
          </label>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => setForm({ open: true, student: null })}>+ Thêm học sinh</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setNotice('')
                setImporting(true)
              }}
            >
              <Icon d={ICONS.inbox} size={18} />
              Nhập Excel / CSV
            </Button>
            <Button variant="secondary" onClick={exportFile} disabled={exporting}>
              {exporting ? 'Đang xuất…' : 'Xuất Excel'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={`min-h-11 rounded-full px-4 text-sm ${pill(filter === k)}`}
            >
              {filter === k ? <Icon d={ICONS.check} size={16} /> : null}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={view === k}
            onClick={() => setView(k)}
            className={`min-h-12 rounded-ctl px-6 text-[15px] ${pill(view === k)}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && !confirming && !confirmingDelete && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      {view === 'groups' && <GroupsView students={students} groups={groups} />}

      {sel && (
        <ProfilePanel
          student={sel}
          detail={current?.data ?? null}
          failed={current?.failed ?? false}
          onClose={() => setSelId(null)}
          onEdit={() => setForm({ open: true, student: { id: sel.id, fullName: sel.fullName, rollNo: sel.rollNo } })}
          onArchive={() => {
            setError('')
            setConfirming(true)
          }}
          onDelete={() => {
            setError('')
            setConfirmingDelete(true)
          }}
        />
      )}

      {view === 'all' && students.length === 0 && (
        <EmptyState
          title="Lớp mình chưa có học sinh nào"
          icon={ICONS.users}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setNotice('')
                setImporting(true)
              }}
            >
              Nhập danh sách từ file
            </Button>
          }
        >
          Cô thêm từng bạn hoặc nhập cả danh sách từ file Excel để bắt đầu nhé.
        </EmptyState>
      )}

      {view === 'all' && students.length > 0 && list.length === 0 && (
        <EmptyState
          title="Chưa tìm thấy phi hành gia nào"
          icon={ICONS.users}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQ('')
                setFilter('all')
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        >
          Cô thử đổi từ khóa hoặc bộ lọc nhé.
        </EmptyState>
      )}

      {view === 'all' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {list.map((s) => {
            const [label, tone, icon] = TODAY[s.today ?? 'none']
            const chosen = selId === s.id
            return (
              <button
                key={s.id}
                type="button"
                data-testid="student-card"
                aria-pressed={chosen}
                onClick={() => setSelId(s.id)}
                className={`clay-card clay-press flex cursor-pointer flex-col items-center gap-1.5 px-3.5 pb-4 pt-5 text-center text-ink [--edge:var(--primary-edge)] ${
                  chosen ? '!border-primary-strong' : ''
                }`}
              >
                <AvatarImage avatar={s.avatar} size={92} />
                <div className="font-display text-lg font-extrabold leading-[1.2]">{s.fullName}</div>
                <div className="text-[13px] font-bold text-muted">
                  Mã {s.code} · {groupLabel(s)}
                </div>
                <div className="flex items-center gap-1.5 text-[17px] font-extrabold text-star-ink">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" fill="#FFC93C" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  {s.competition} sao
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-extrabold ${tone}`}>
                  <Icon d={icon} size={14} />
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <ImportDialog
        open={importing}
        existingCodes={existingCodes}
        onClose={() => setImporting(false)}
        onDone={(n) => {
          setImporting(false)
          setNotice(`Đã thêm ${n} học sinh.`)
        }}
      />
      <StudentForm open={form.open} student={form.student} onClose={() => setForm({ open: false, student: null })} />

      <Modal open={confirming && !!sel} onClose={() => setConfirming(false)} title="Lưu trữ học sinh?">
        <p className="m-0 mb-4 flex items-start gap-3 text-base font-semibold text-muted">
          <Icon d={ICONS.alert} size={22} className="mt-0.5 text-danger" />
          <span>
            {sel?.fullName} sẽ không còn trong danh sách lớp, Trạm thi đua và bảng xếp hạng. Sổ sao và lịch sử vẫn được giữ lại.
          </span>
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="mt-3 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={confirmArchive} disabled={pending}>
            {pending ? 'Đang lưu trữ…' : 'Lưu trữ'}
          </Button>
        </div>
      </Modal>

      <Modal open={confirmingDelete && !!sel} onClose={() => setConfirmingDelete(false)} title="Xóa học sinh?">
        <p className="m-0 mb-2 flex items-start gap-3 text-base font-semibold text-muted">
          <Icon d={ICONS.alert} size={22} className="mt-0.5 text-danger" />
          <span>
            {sel?.fullName} sẽ bị xóa hẳn cùng toàn bộ sao, lịch sử đổi quà, điểm danh, huy hiệu và tài khoản đăng nhập của em. Việc này không hoàn tác được.
          </span>
        </p>
        <p className="m-0 mb-4 text-base font-semibold text-muted">
          Nếu em chỉ chuyển lớp hoặc nghỉ học và cô muốn giữ lịch sử, hãy chọn Lưu trữ thay vì Xóa.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="mt-3 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={pending}>
            Xóa vĩnh viễn
          </Button>
        </div>
      </Modal>
    </div>
  )
}
