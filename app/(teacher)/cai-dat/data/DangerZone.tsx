import { useState, type FormEvent, type TransitionStartFunction } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, ICONS } from '@/components/ui/Icon'
import { toVietnameseMessage } from '@/lib/errors'
import { DEFAULT_COPY, nextSchoolYear, type CopyKey } from '@/lib/backup/year'
import { deleteDemoData, openNewYear } from '../data-actions'
import { DeleteDemoModal } from './DeleteDemoModal'
import { NewYearModal, type YearForm } from './NewYearModal'
import { action, isRedirect, type Current } from './shared'

export function DangerZone({
  classId,
  current,
  demoCount,
  pending,
  startTransition,
  setError,
  setDone,
}: {
  classId: string
  current: Current
  demoCount: number
  pending: boolean
  startTransition: TransitionStartFunction
  setError: (e: string | null) => void
  setDone: (d: string | null) => void
}) {
  const router = useRouter()
  const [yearOpen, setYearOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deleteSure, setDeleteSure] = useState(false)
  const [archiveAsk, setArchiveAsk] = useState(false)
  const [yearForm, setYearForm] = useState<YearForm>({ schoolYear: '', className: '', teacherName: '' })
  const [copy, setCopy] = useState<CopyKey[]>(DEFAULT_COPY)

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
    <>
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

      <NewYearModal
        open={yearOpen}
        onClose={closeYear}
        onSubmit={submitYear}
        pending={pending}
        form={yearForm}
        setForm={setYearForm}
        copy={copy}
        onToggleCopy={toggleCopy}
      />

      <DeleteDemoModal
        open={deleteOpen}
        onClose={closeDelete}
        demoCount={demoCount}
        step={deleteStep}
        setStep={setDeleteStep}
        sure={deleteSure}
        setSure={setDeleteSure}
        pending={pending}
        onDelete={removeDemo}
      />
    </>
  )
}
