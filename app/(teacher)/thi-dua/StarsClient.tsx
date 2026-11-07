'use client'

import { useMemo, useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { StarBurst } from '@/components/stars/StarBurst'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { UndoToast } from '@/components/ui/UndoToast'
import { joinNames } from '@/lib/domain/names'
import { formatRelative } from '@/lib/domain/relative-time'
import type { StarBatchView } from '@/lib/stars/history'
import type { StarCriterion, StarGroup, StudentWithStars } from '@/lib/stars/queries'
import { archiveCriterion, awardStars, penalizeStars, saveCriterion, undoBatch } from './actions'

export type Mode = 'add' | 'sub'

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

const SUB_MAX = 5
const card = 'clay-card p-[22px_24px]'
const h2 = 'm-0 font-display text-[22px] font-extrabold'
const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'

/** Ngữ cảnh để Hoàn tác ngay sau khi chấm: nhận ra lượt vừa tạo trong `batches` sau khi trang làm mới. */
type UndoCtx = { key: number; knownIds: string[]; studentIds: string[]; points: number; isAdd: boolean }

function defaultAmount(mode: Mode, steps: number[]): number {
  const list = mode === 'add' ? steps : steps.filter((n) => n <= SUB_MAX)
  const preferred = mode === 'add' ? 2 : 1
  return list.includes(preferred) ? preferred : (list[0] ?? preferred)
}

function signed(n: number): string {
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}`
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
  const [undoCtx, setUndoCtx] = useState<UndoCtx | null>(null)
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
  // Lượt vừa chấm: batch mới (chưa có trước khi gửi), cùng loại, cùng số sao, cùng nhóm bạn, chưa bị hoàn tác.
  const undoTarget = useMemo(() => {
    if (!undoCtx) return null
    const want = new Set(undoCtx.studentIds)
    return (
      batches.find(
        (b) =>
          !undoCtx.knownIds.includes(b.batchId) &&
          !b.reversed &&
          b.kind === (undoCtx.isAdd ? 'award' : 'penalty') &&
          Math.abs(b.delta) === undoCtx.points &&
          b.studentIds.length === want.size &&
          b.studentIds.every((id) => want.has(id)),
      ) ?? null
    )
  }, [undoCtx, batches])
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
      setUndoCtx({ key: Date.now(), knownIds, studentIds: input.studentIds, points: input.points, isAdd })
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

  /** Hoàn tác lượt vừa chấm bằng chính hành động hoàn tác của lịch sử (ghi thêm bản ghi đảo, không xóa bản cũ). */
  function undoLast() {
    if (!undoTarget) return
    const id = undoTarget.batchId
    setUndoCtx(null)
    undo(id)
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


  const chip = (on: boolean) =>
    on
      ? 'border-primary-strong bg-primary-soft text-primary-deep'
      : 'border-edge bg-white text-ink hover:bg-primary-soft'
  const manageList = [...criteria.filter((c) => c.kind === 'award'), ...criteria.filter((c) => c.kind === 'penalty')]
  const onAmount = isAdd ? 'border-star-edge bg-star text-star-ink' : 'border-danger bg-danger text-white'

  return (
    <>
      <section className={`${card} flex flex-col gap-3.5`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className={h2}>
            1. Chọn học sinh{' '}
            <span className="font-body text-[15px] font-bold text-muted">(đã chọn {selected.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={() => {
                setSel(new Set(students.map((s) => s.id)))
                setErr('')
              }}
            >
              Chọn cả lớp
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSel(new Set())
                setErr('')
              }}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-extrabold text-muted">Chọn cả tổ:</span>
            {groups.map((g) => {
              const ids = g.memberIds.filter((id) => byId.has(id))
              const on = ids.length > 0 && ids.every((id) => sel.has(id))
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleGroup(g)}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-[14.5px] font-extrabold transition-colors ${chip(on)}`}
                >
                  {on ? <Icon d={ICONS.check} size={16} /> : null}
                  {g.name} ({ids.length} bạn)
                </button>
              )
            })}
          </div>
        )}
        {students.length === 0 ? (
          <EmptyState title="Lớp chưa có học sinh" icon={ICONS.users}>
            Cô thêm học sinh ở trang Quản lý học sinh rồi quay lại chấm sao nhé.
          </EmptyState>
        ) : null}
        <div data-testid="students" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
          {students.map((s) => {
            const on = sel.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStudent(s.id)}
                className={`relative flex min-h-16 cursor-pointer items-center gap-2.5 rounded-[18px] border-2 px-3 py-2.5 text-left text-ink transition-colors ${
                  on ? 'border-primary-strong bg-primary-soft' : 'border-edge bg-white hover:bg-bg'
                }`}
              >
                <AvatarImage avatar={s.avatar} size={46} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[14.5px] font-extrabold leading-[1.2]">{s.fullName}</span>
                  <span className="text-[12.5px] font-bold text-muted">{s.available} sao khả dụng</span>
                </span>
                {on ? (
                  <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary-strong text-white">
                    <Icon d={ICONS.check} size={13} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className={`${card} relative flex flex-col gap-[18px]`}>
        <h2 className={h2}>2. Chọn thao tác và lý do</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            aria-pressed={isAdd}
            onClick={() => chooseMode('add')}
            className={`inline-flex min-h-16 flex-[1_1_180px] cursor-pointer items-center justify-center gap-2 rounded-[20px] border-2 text-xl font-extrabold transition-colors ${
              isAdd ? 'border-star-edge bg-star text-star-ink shadow-[0_4px_0_var(--color-star-edge)]' : 'border-edge bg-white text-ink hover:bg-primary-soft'
            }`}
          >
            {isAdd ? <Icon d={ICONS.check} size={22} /> : null}+ Cộng sao
          </button>
          <button
            type="button"
            aria-pressed={!isAdd}
            onClick={() => chooseMode('sub')}
            className={`inline-flex min-h-16 flex-[1_1_180px] cursor-pointer items-center justify-center gap-2 rounded-[20px] border-2 text-xl font-extrabold transition-colors ${
              !isAdd ? 'border-danger bg-danger text-white shadow-[0_4px_0_var(--color-danger-deep)]' : 'border-edge bg-white text-ink hover:bg-primary-soft'
            }`}
          >
            {!isAdd ? <Icon d={ICONS.check} size={22} /> : null}− Trừ sao
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[15px] font-extrabold text-ink">Số sao</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div data-testid="amounts" className="contents">
              {amountList.map((v) => {
                const on = custom === '' && amount === v
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setAmount(v)
                      setCustom('')
                      setErr('')
                    }}
                    className={`min-h-14 min-w-[72px] cursor-pointer rounded-[16px] border-2 px-4 text-xl font-extrabold transition-colors ${
                      on ? onAmount : 'border-edge bg-white text-ink hover:bg-primary-soft'
                    }`}
                  >
                    {isAdd ? '+' : '−'}
                    {v}
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-muted">
              Tùy chỉnh
              <Input
                type="number"
                min={1}
                max={100}
                value={custom}
                placeholder="Số khác"
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10)
                  setCustom(e.target.value === '' || Number.isNaN(n) ? '' : String(Math.min(100, Math.max(1, n))))
                  setErr('')
                }}
                className="!min-h-14 !w-[120px] text-lg"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[15px] font-extrabold text-ink">Tiêu chí</div>
          {critList.length === 0 ? (
            <p className="m-0 text-sm font-semibold text-muted">
              Chưa có tiêu chí {isAdd ? 'cộng' : 'trừ'} sao. Cô thêm ở khung Quản lý tiêu chí bên dưới, hoặc ghi lý do vào ô ghi chú.
            </p>
          ) : null}
          <div data-testid="criteria-picker" className="flex flex-wrap gap-2">
            {critList.map((c) => {
              const on = c.id === critId
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickCriterion(c)}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-3.5 text-[14.5px] font-bold transition-colors ${chip(on)}`}
                >
                  {on ? <Icon d={ICONS.check} size={16} /> : null}
                  {c.label} <b>{isAdd ? '+' : '−'}{c.defaultPoints}</b>
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Ghi chú / lý do khác">
          {(f) => (
            <Input
              {...f}
              type="text"
              value={note}
              maxLength={200}
              placeholder="Cô nhập thêm lý do nếu cần"
              onChange={(e) => {
                setNote(e.target.value)
                setErr('')
              }}
            />
          )}
        </Field>

        {err && <Notice tone="error">{err}</Notice>}
        {msg && <Notice tone="success">{msg}</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-bold text-muted">
            {selected.length
              ? `${isAdd ? 'Cộng' : 'Trừ'} ${amt} sao cho ${selected.length} học sinh`
              : 'Chưa chọn học sinh'}
          </div>
          <Button size="lg" variant={isAdd ? 'accent' : 'danger'} onClick={submit} disabled={pending} className="!px-8 !text-xl">
            {isAdd ? 'Xác nhận cộng sao' : 'Xác nhận trừ sao'}
          </Button>
        </div>
        <StarBurst playKey={flash} />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section data-testid="history" className={`${card} flex min-w-0 flex-[1_1_420px] flex-col gap-3 !p-6`}>
          <h2 className={h2}>Lịch sử giao dịch sao</h2>
          <div className="text-[13.5px] font-semibold text-muted">Hoàn tác sẽ tạo thêm một bản ghi mới, không xóa bản ghi cũ.</div>
          {batches.map((b) => {
            const isReversal = b.kind === 'reversal'
            const done = isReversal || b.reversed
            const positive = b.delta > 0
            return (
              <div key={b.batchId} data-testid="history-row" className="flex items-center gap-3 rounded-2xl bg-bg px-3.5 py-2.5">
                <div
                  className={`min-w-[46px] shrink-0 rounded-xl px-2 py-1.5 text-center font-extrabold ${
                    positive ? 'bg-star-soft text-star-ink' : 'bg-danger-soft text-danger-deep'
                  }`}
                >
                  {signed(b.delta)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-extrabold">{joinNames(b.studentNames)}</div>
                  <div className="text-[13px] font-semibold text-muted">
                    {b.reason} · {formatRelative(new Date(b.at), now)} · {b.actorName}
                  </div>
                </div>
                <Button variant="secondary" disabled={done || pending} onClick={() => setUndoing(b)} className="!px-3 text-[13px]">
                  {!done ? <Icon d={ICONS.undo} size={16} /> : null}
                  {isReversal ? 'Đã ghi' : b.reversed ? 'Đã hoàn tác' : 'Hoàn tác'}
                </Button>
              </div>
            )
          })}
          {batches.length === 0 && (
            <EmptyState title="Chưa có giao dịch nào" icon={ICONS.star}>
              Cô chọn học sinh rồi cộng hoặc trừ sao, lịch sử sẽ hiện ở đây.
            </EmptyState>
          )}
        </section>

        <section data-testid="manage" className={`${card} flex min-w-0 flex-[1_1_320px] flex-col gap-3 !p-6`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={h2}>Quản lý tiêu chí</h2>
            <Button onClick={() => openEditor()}>+ Thêm tiêu chí</Button>
          </div>
          <div className="text-[13.5px] font-semibold text-muted">Cô có thể sửa tên, số sao mặc định hoặc lưu trữ từng tiêu chí.</div>
          {manageList.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-[14px] bg-bg px-3 py-2">
              <span
                className={`min-w-9 shrink-0 rounded-[10px] px-2 py-1 text-center text-[13px] font-extrabold ${
                  c.kind === 'award' ? 'bg-star-soft text-star-ink' : 'bg-danger-soft text-danger-deep'
                }`}
              >
                {c.kind === 'award' ? '+' : '−'}
                {c.defaultPoints}
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-bold">{c.label}</span>
              <button
                type="button"
                aria-label={`Sửa tiêu chí ${c.label}`}
                onClick={() => openEditor(c)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-primary-ink hover:bg-primary-soft"
              >
                <Icon d={PENCIL} size={19} />
              </button>
              <button
                type="button"
                aria-label={`Lưu trữ tiêu chí ${c.label}`}
                onClick={() => setArchiving(c)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-danger-deep hover:bg-danger-soft"
              >
                <Icon d={ICONS.trash} size={19} />
              </button>
            </div>
          ))}
          {manageList.length === 0 && (
            <EmptyState title="Chưa có tiêu chí nào" icon={ICONS.plus}>
              Thêm tiêu chí để chấm sao nhanh hơn, ví dụ &quot;Giúp đỡ bạn bè&quot;.
            </EmptyState>
          )}
        </section>
      </div>

      {undoCtx && undoTarget ? (
        <UndoToast
          id={undoCtx.key}
          message={`Vừa ${undoCtx.isAdd ? 'cộng' : 'trừ'} ${undoCtx.points} sao cho ${undoCtx.studentIds.length} bạn.`}
          onUndo={undoLast}
          onDismiss={() => setUndoCtx(null)}
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
