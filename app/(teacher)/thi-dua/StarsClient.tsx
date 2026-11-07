'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { UndoToast } from '@/components/ui/UndoToast'
import { joinNames } from '@/lib/domain/names'
import type { StarBatchView } from '@/lib/stars/history'
import type { StarCriterion, StarGroup, StudentWithStars } from '@/lib/stars/queries'
import { archiveCriterion, awardStars, penalizeStars, saveCriterion, undoBatch } from './actions'
import { ActionPanel } from './ActionPanel'
import { BatchHistory } from './BatchHistory'
import { CriteriaManager } from './CriteriaManager'
import { defaultAmount, type Mode, SUB_MAX, signed } from './helpers'
import { StudentPicker } from './StudentPicker'
import { useUndoAward } from './use-undo-award'

export type { Mode }

type Props = {
  students: StudentWithStars[]
  groups: StarGroup[]
  criteria: StarCriterion[]
  steps: number[]
  batches: StarBatchView[]
  nowIso: string
  /** Giá trị khởi tạo, để các trang khác mở sẵn một lựa chọn. */
  initialSelectedIds?: string[]
  initialMode?: Mode
}

export function StarsClient({
  students,
  groups,
  criteria,
  steps,
  batches,
  nowIso,
  initialSelectedIds = [],
  initialMode = 'add',
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [sel, setSel] = useState<Set<string>>(() => new Set(initialSelectedIds))
  const [amount, setAmount] = useState(() => defaultAmount(initialMode, steps))
  const [custom, setCustom] = useState('')
  const [critId, setCritId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [undoing, setUndoing] = useState<StarBatchView | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState(0)
  const [pending, startTransition] = useTransition()


  const isAdd = mode === 'add'
  const now = new Date(nowIso)
  const byId = new Map(students.map((s) => [s.id, s]))
  const selected = students.filter((s) => sel.has(s.id))
  const customN = Number.parseInt(custom, 10)
  const amt = custom !== '' && customN > 0 ? customN : amount
  const amountList = isAdd ? steps : steps.filter((n) => n <= SUB_MAX)
  const critList = criteria.filter((c) => c.kind === (isAdd ? 'award' : 'penalty'))
  const crit = critList.find((c) => c.id === critId) ?? null
  const reasonText = [crit?.label, note.trim()].filter(Boolean).join(' – ')
  const { undoCtx, undoTarget, arm, dismiss: dismissUndo, undoLast } = useUndoAward(batches, undo)
  const nameList = (ids: string[]) =>
    joinNames(
      ids
        .map((id) => byId.get(id))
        .filter((s): s is StudentWithStars => !!s)
        .sort((a, b) => a.rollNo - b.rollNo)
        .map((s) => s.fullName),
    )

  function validate(): string {
    if (!selected.length) return 'Cô hãy chọn ít nhất một học sinh.'
    if (!(amt > 0)) return 'Số sao phải lớn hơn 0.'
    if (!reasonText) return 'Cô hãy chọn một tiêu chí hoặc nhập lý do.'
    if (!isAdd) {
      const low = selected.filter((s) => s.available < amt)
      if (low.length) {
        return `Không đủ sao khả dụng để trừ: ${joinNames(low.map((s) => s.fullName))}. Cô hãy giảm số sao hoặc xử lý riêng.`
      }
    }
    return ''
  }

  function chooseMode(m: Mode) {
    setMode(m)
    setCritId(null)
    setAmount(defaultAmount(m, steps))
    setCustom('')
    setConfirming(false)
    setErr('')
    setMsg('')
  }

  function toggleStudent(id: string) {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSel(next)
    setErr('')
  }

  function toggleGroup(g: StarGroup) {
    const ids = g.memberIds.filter((id) => byId.has(id))
    const all = ids.length > 0 && ids.every((id) => sel.has(id))
    const next = new Set(sel)
    for (const id of ids) {
      if (all) next.delete(id)
      else next.add(id)
    }
    setSel(next)
    setErr('')
  }

  function pickCriterion(c: StarCriterion) {
    if (critId === c.id) {
      setCritId(null)
    } else {
      setCritId(c.id)
      setAmount(c.defaultPoints)
      setCustom('')
    }
    setErr('')
  }

  function run() {
    const problem = validate()
    if (problem) {
      setErr(problem)
      setMsg('')
      setConfirming(false)
      return
    }
    const input = { studentIds: selected.map((s) => s.id), points: amt, criterionId: crit?.id ?? null, note: note.trim() }
    const knownIds = batches.map((b) => b.batchId)
    startTransition(async () => {
      const res = await (isAdd ? awardStars(input) : penalizeStars(input))
      setConfirming(false)
      if (res.error) {
        setErr(res.error)
        setMsg('')
        return
      }
      setErr('')
      setMsg(res.message ?? '')
      if (isAdd) setFlash((f) => f + 1)
      arm({ knownIds, studentIds: input.studentIds, points: input.points, isAdd })
    })
  }

  function submit() {
    const problem = validate()
    if (problem) {
      setErr(problem)
      setMsg('')
      setConfirming(false)
      return
    }
    if (isAdd) run()
    else {
      setErr('')
      setMsg('')
      setConfirming(true)
    }
  }

  function undo(batchId: string) {
    startTransition(async () => {
      const res = await undoBatch(batchId)
      setUndoing(null)
      if (res.error) {
        setErr(res.error)
        setMsg('')
      } else {
        setErr('')
        setMsg(res.message ?? '')
      }
    })
  }

  // Quản lý tiêu chí
  const [editing, setEditing] = useState<{ id?: string; kind: 'award' | 'penalty' } | null>(null)
  const [fLabel, setFLabel] = useState('')
  const [fPoints, setFPoints] = useState('')
  const [fErr, setFErr] = useState('')
  const [archiving, setArchiving] = useState<StarCriterion | null>(null)

  function openEditor(c?: StarCriterion) {
    setEditing(c ? { id: c.id, kind: c.kind } : { kind: isAdd ? 'award' : 'penalty' })
    setFLabel(c?.label ?? '')
    setFPoints(String(c?.defaultPoints ?? (isAdd ? 2 : 1)))
    setFErr('')
  }

  function saveEditor() {
    if (!editing) return
    const label = fLabel.trim()
    const points = Number.parseInt(fPoints, 10)
    if (!label) return setFErr('Cô hãy nhập tên tiêu chí.')
    if (!(points > 0)) return setFErr('Số sao phải lớn hơn 0.')
    startTransition(async () => {
      const res = await saveCriterion({ id: editing.id, kind: editing.kind, label, defaultPoints: points })
      if (res.error) setFErr(res.error)
      else setEditing(null)
    })
  }

  function confirmArchive() {
    if (!archiving) return
    const id = archiving.id
    startTransition(async () => {
      const res = await archiveCriterion(id)
      setArchiving(null)
      if (res.error) {
        setErr(res.error)
        setMsg('')
      } else if (critId === id) setCritId(null)
    })
  }

  const manageList = [...criteria.filter((c) => c.kind === 'award'), ...criteria.filter((c) => c.kind === 'penalty')]

  return (
    <>
      <StudentPicker
        students={students}
        groups={groups}
        sel={sel}
        selectedCount={selected.length}
        onSelectAll={() => {
          setSel(new Set(students.map((s) => s.id)))
          setErr('')
        }}
        onClear={() => {
          setSel(new Set())
          setErr('')
        }}
        onToggleStudent={toggleStudent}
        onToggleGroup={toggleGroup}
      />

      <ActionPanel
        mode={mode}
        amountList={amountList}
        amount={amount}
        custom={custom}
        amt={amt}
        critList={critList}
        critId={critId}
        note={note}
        err={err}
        msg={msg}
        selectedCount={selected.length}
        pending={pending}
        flash={flash}
        onMode={chooseMode}
        onAmount={(v) => {
          setAmount(v)
          setCustom('')
          setErr('')
        }}
        onCustom={(raw) => {
          const n = Number.parseInt(raw, 10)
          setCustom(raw === '' || Number.isNaN(n) ? '' : String(Math.min(100, Math.max(1, n))))
          setErr('')
        }}
        onPickCriterion={pickCriterion}
        onNote={(v) => {
          setNote(v)
          setErr('')
        }}
        onSubmit={submit}
      />

      <div className="flex flex-wrap items-start gap-4">
        <BatchHistory batches={batches} now={now} pending={pending} onUndo={setUndoing} />
        <CriteriaManager manageList={manageList} onAdd={() => openEditor()} onEdit={openEditor} onArchive={setArchiving} />
      </div>

      {undoCtx && undoTarget ? (
        <UndoToast
          id={undoCtx.key}
          message={`Vừa ${undoCtx.isAdd ? 'cộng' : 'trừ'} ${undoCtx.points} sao cho ${undoCtx.studentIds.length} bạn.`}
          onUndo={undoLast}
          onDismiss={dismissUndo}
          seconds={8}
        />
      ) : null}

      <ConfirmDialog
        open={confirming}
        danger
        pending={pending}
        title="Xác nhận trừ sao"
        message={`Cô muốn trừ ${amt} sao của ${nameList(selected.map((s) => s.id))} với lý do "${reasonText}"?`}
        confirmLabel="Đồng ý trừ sao"
        cancelLabel="Hủy"
        onCancel={() => setConfirming(false)}
        onConfirm={run}
      />

      <ConfirmDialog
        open={undoing !== null}
        danger
        pending={pending}
        title="Xác nhận hoàn tác"
        message={`Cô muốn hoàn tác lượt ${undoing ? signed(undoing.delta) : ''} của ${undoing ? joinNames(undoing.studentNames) : ''}?`}
        confirmLabel="Đồng ý hoàn tác"
        cancelLabel="Hủy"
        onCancel={() => setUndoing(null)}
        onConfirm={() => undoing && undo(undoing.batchId)}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sửa tiêu chí' : editing?.kind === 'penalty' ? 'Thêm tiêu chí trừ sao' : 'Thêm tiêu chí cộng sao'}
      >
        <div className="flex flex-col gap-4">
          {fErr && <Notice tone="error">{fErr}</Notice>}
          <Field label="Tên tiêu chí">
            {(f) => <Input {...f} type="text" value={fLabel} maxLength={200} onChange={(e) => setFLabel(e.target.value)} />}
          </Field>
          <Field label="Số sao mặc định">
            {(f) => (
              <Input {...f} type="number" min={1} max={100} value={fPoints} onChange={(e) => setFPoints(e.target.value)} className="!w-[140px]" />
            )}
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button disabled={pending} onClick={saveEditor}>
              Lưu tiêu chí
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={archiving !== null}
        danger
        pending={pending}
        title="Lưu trữ tiêu chí"
        message={`Cô muốn lưu trữ tiêu chí "${archiving?.label ?? ''}"? Các bản ghi sao cũ vẫn được giữ.`}
        confirmLabel="Đồng ý lưu trữ"
        cancelLabel="Hủy"
        onCancel={() => setArchiving(null)}
        onConfirm={confirmArchive}
      />
    </>
  )
}
