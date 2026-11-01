'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { givenNameKey, matchesSearch } from '@/lib/domain/vn-text'
import type { StarGroup } from '@/lib/stars/queries'
import type { StudentCard, TodayStatus } from '@/lib/students/queries'
import { archiveStudent, deleteStudent, exportStudents, loadProfile, type ProfileDetail } from './actions'
import { GroupsView } from './GroupsView'
import { ImportDialog } from './ImportDialog'
import { ProfilePanel } from './ProfilePanel'
import { StudentForm, type EditTarget } from './StudentForm'

type Sort = 'name' | 'stars' | 'no'
type Filter = 'all' | 'present' | 'absent' | 'late'
type View = 'all' | 'groups'

const TODAY: Record<NonNullable<TodayStatus> | 'none', [string, string, string]> = {
  present: ['Có mặt', '#DDF6F1', '#0B5A4D'],
  late: ['Đi trễ', '#FFF1CC', '#6E4700'],
  absent_excused: ['Vắng có phép', '#E3EEFF', '#1F4C9E'],
  absent_unexcused: ['Vắng', '#FFE3EA', '#8E1B3B'],
  none: ['Chưa điểm danh', '#F0EEFA', '#4A476E'],
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
const pill = (on: boolean, h: number) => ({
  minHeight: h,
  background: on ? 'var(--primary-strong)' : '#fff',
  color: on ? '#fff' : '#3A3769',
  border: `2px solid ${on ? 'var(--primary-strong)' : '#D9D5F2'}`,
})
const ghostBtn =
  'min-h-12 rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-4 text-[14.5px] font-extrabold text-primary-ink disabled:cursor-not-allowed disabled:opacity-60'

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
    startTransition(async () => {
      const res = await archiveStudent(sel.id)
      if (res.error) setError(res.error)
      else {
        setConfirming(false)
        setSelId(null)
        setError('')
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
      <div className="flex flex-col gap-3.5 rounded-[26px] bg-white px-6 py-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-[1_1_360px] flex-wrap gap-2.5">
            <label className="box-border flex min-h-12 flex-[1_1_220px] items-center gap-2 rounded-[14px] border-2 border-[#D9D5F2] bg-white px-3.5">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5B5890" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên hoặc mã học sinh"
                aria-label="Tìm học sinh"
                className="min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-ink outline-0"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-[#4A476E]">
              Sắp xếp
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sắp xếp"
                className="min-h-12 rounded-[14px] border-2 border-[#D9D5F2] bg-white px-3 text-[15px] font-bold text-ink"
              >
                <option value="name">Theo tên (A–Z)</option>
                <option value="stars">Theo số sao</option>
                <option value="no">Theo số thứ tự</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setForm({ open: true, student: null })}
              className="min-h-12 rounded-[14px] bg-primary-strong px-5 text-[15px] font-extrabold text-white"
            >
              + Thêm học sinh
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice('')
                setImporting(true)
              }}
              className={ghostBtn}
            >
              Nhập Excel / CSV
            </button>
            <button type="button" onClick={exportFile} disabled={exporting} className={ghostBtn}>
              Xuất Excel
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className="cursor-pointer rounded-full px-4 text-sm font-extrabold"
              style={pill(filter === k, 44)}
            >
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
            className="cursor-pointer rounded-[14px] px-6 text-[15px] font-extrabold"
            style={pill(view === k, 48)}
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

      {view === 'all' && list.length === 0 && (
        <div className="rounded-[26px] bg-white px-6 py-10 text-center shadow-[0_6px_20px_rgba(102,117,232,.10)]">
          <div className="font-display text-[22px] font-extrabold">Chưa tìm thấy phi hành gia nào</div>
          <div className="text-[15px] text-[#5B5890]">Cô thử đổi từ khóa hoặc bộ lọc nhé.</div>
        </div>
      )}

      {view === 'all' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {list.map((s) => {
            const [label, bg, ink] = TODAY[s.today ?? 'none']
            return (
              <button
                key={s.id}
                type="button"
                data-testid="student-card"
                onClick={() => setSelId(s.id)}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[26px] bg-white px-3.5 pb-4 pt-5 text-center text-ink shadow-[0_6px_20px_rgba(102,117,232,.10)] transition hover:-translate-y-[3px] hover:shadow-[0_14px_28px_rgba(79,91,213,.20)]"
                style={{ border: `2px solid ${selId === s.id ? 'var(--primary-strong)' : 'transparent'}` }}
              >
                <AvatarImage avatar={s.avatar} size={92} />
                <div className="font-display text-lg font-extrabold leading-[1.2]">{s.fullName}</div>
                <div className="text-[13px] font-bold text-[#5B5890]">
                  Mã {s.code} · {groupLabel(s)}
                </div>
                <div className="flex items-center gap-1.5 text-[17px] font-extrabold text-[#7A4E00]">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9" fill="#FFC857" stroke="#E0A020" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  {s.competition} sao
                </div>
                <span className="rounded-full px-3 py-1 text-[12.5px] font-extrabold" style={{ background: bg, color: ink }}>
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
        <p className="mb-4 text-[15px] font-semibold text-[#4A476E]">
          {sel?.fullName} sẽ không còn trong danh sách lớp, Trạm thi đua và bảng xếp hạng. Sổ sao và lịch sử vẫn được giữ lại.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="mt-3 flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={confirmArchive} disabled={pending}>
            Lưu trữ
          </Button>
        </div>
      </Modal>

      <Modal open={confirmingDelete && !!sel} onClose={() => setConfirmingDelete(false)} title="Xóa học sinh?">
        <p className="mb-2 text-[15px] font-semibold text-[#4A476E]">
          {sel?.fullName} sẽ bị xóa hẳn cùng toàn bộ sao, lịch sử đổi quà, điểm danh, huy hiệu và tài khoản đăng nhập của em. Việc này không hoàn tác được.
        </p>
        <p className="mb-4 text-[15px] font-semibold text-[#4A476E]">
          Nếu em chỉ chuyển lớp hoặc nghỉ học và cô muốn giữ lịch sử, hãy chọn Lưu trữ thay vì Xóa.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="mt-3 flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={pending}>
            Xóa vĩnh viễn
          </Button>
        </div>
      </Modal>
    </div>
  )
}
