'use client'

import { useState, useTransition } from 'react'
import { AvatarImage } from '@/components/avatar/AvatarImage'
import { StarBurst } from '@/components/stars/StarBurst'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Notice } from '@/components/ui/Notice'
import { joinNames } from '@/lib/domain/names'
import { formatRelative } from '@/lib/domain/relative-time'
import type { StarBatch } from '@/lib/stars/history'
import type { StarCriterion, StarGroup, StudentWithStars } from '@/lib/stars/queries'
import { archiveCriterion, awardStars, penalizeStars, saveCriterion, undoBatch } from './actions'

export type Mode = 'add' | 'sub'

type Props = {
  students: StudentWithStars[]
  groups: StarGroup[]
  criteria: StarCriterion[]
  steps: number[]
  batches: StarBatch[]
  nowIso: string
  /** Giá trị khởi tạo, để các trang khác mở sẵn một lựa chọn. */
  initialSelectedIds?: string[]
  initialMode?: Mode
}

const SUB_MAX = 5
const card = 'rounded-[26px] bg-white p-[22px_24px] shadow-[0_6px_20px_rgba(102,117,232,0.10)]'
const h2 = 'm-0 font-display text-[22px] font-extrabold'

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

  const goBg = isAdd ? 'bg-[#FFC857] text-[#4A3300]' : 'bg-[#C0314E] text-white'
  const pill = (on: boolean) =>
    on ? 'border-primary-strong bg-[#EEF0FF] text-[#2C37A8]' : 'border-[#D9D5F2] bg-white text-[#3A3769]'
  const manageList = [...criteria.filter((c) => c.kind === 'award'), ...criteria.filter((c) => c.kind === 'penalty')]

  return (
    <>
      <section className={`${card} flex flex-col gap-3.5`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className={h2}>
            1. Chọn học sinh{' '}
            <span className="font-body text-[15px] font-bold text-muted">(đã chọn {selected.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSel(new Set(students.map((s) => s.id)))
                setErr('')
              }}
              className="min-h-11 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-[18px] text-[14.5px] font-extrabold text-[#3441B5]"
            >
              Chọn cả lớp
            </button>
            <button
              type="button"
              onClick={() => {
                setSel(new Set())
                setErr('')
              }}
              className="min-h-11 cursor-pointer rounded-[14px] border-[1.5px] border-[#D9D5F2] bg-white px-[18px] text-[14.5px] font-extrabold text-[#4A476E]"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14.5px] font-extrabold text-[#4A476E]">Chọn cả tổ:</span>
          {groups.map((g) => {
            const ids = g.memberIds.filter((id) => byId.has(id))
            const on = ids.length > 0 && ids.every((id) => sel.has(id))
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGroup(g)}
                className={`min-h-11 cursor-pointer rounded-full border-2 px-4 text-[14.5px] font-extrabold ${pill(on)}`}
              >
                {g.name} ({ids.length} bạn)
              </button>
            )
          })}
        </div>
        <div data-testid="students" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
          {students.map((s) => {
            const on = sel.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStudent(s.id)}
                className={`flex min-h-16 cursor-pointer items-center gap-2.5 rounded-[18px] border-2 px-3 py-2.5 text-left text-ink ${
                  on ? 'border-primary-strong bg-[#EEF0FF]' : 'border-[#E4E0F7] bg-white'
                }`}
              >
                <AvatarImage avatar={s.avatar} size={46} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[14.5px] font-extrabold leading-[1.2]">{s.fullName}</span>
                  <span className="text-[12.5px] font-bold text-muted">{s.available} sao khả dụng</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className={`${card} relative flex flex-col gap-[18px]`}>
        <h2 className={h2}>2. Chọn thao tác và lý do</h2>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-pressed={isAdd}
            onClick={() => chooseMode('add')}
            className={`min-h-14 flex-[1_1_180px] cursor-pointer rounded-[18px] border-2 text-lg font-extrabold ${
              isAdd ? 'border-[#E0A020] bg-[#FFC857] text-[#4A3300]' : 'border-[#D9D5F2] bg-white text-[#3A3769]'
            }`}
          >
            + Cộng sao
          </button>
          <button
            type="button"
            aria-pressed={!isAdd}
            onClick={() => chooseMode('sub')}
            className={`min-h-14 flex-[1_1_180px] cursor-pointer rounded-[18px] border-2 text-lg font-extrabold ${
              !isAdd ? 'border-[#C0314E] bg-[#C0314E] text-white' : 'border-[#D9D5F2] bg-white text-[#3A3769]'
            }`}
          >
            − Trừ sao
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[14.5px] font-extrabold text-[#4A476E]">Số sao</div>
          <div className="flex flex-wrap items-center gap-2">
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
                    className={`min-h-12 min-w-16 cursor-pointer rounded-[14px] border-2 px-3.5 text-[17px] font-extrabold ${
                      on
                        ? isAdd
                          ? 'border-[#E0A020] bg-[#FFC857] text-[#4A3300]'
                          : 'border-[#C0314E] bg-[#C0314E] text-white'
                        : 'border-[#D9D5F2] bg-white text-[#3A3769]'
                    }`}
                  >
                    {isAdd ? '+' : '−'}
                    {v}
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-[#4A476E]">
              Tùy chỉnh
              <input
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
                className="min-h-12 w-[100px] rounded-[14px] border-2 border-[#D9D5F2] px-3 text-base font-bold text-ink"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[14.5px] font-extrabold text-[#4A476E]">Tiêu chí</div>
          <div data-testid="criteria-picker" className="flex flex-wrap gap-2">
            {critList.map((c) => {
              const on = c.id === critId
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickCriterion(c)}
                  className={`min-h-11 cursor-pointer rounded-full border-2 px-3.5 text-[14.5px] font-bold ${pill(on)}`}
                >
                  {c.label} <b>{isAdd ? '+' : '−'}{c.defaultPoints}</b>
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-[14.5px] font-extrabold text-[#4A476E]">
          Ghi chú / lý do khác
          <input
            type="text"
            value={note}
            maxLength={200}
            placeholder="Cô nhập thêm lý do nếu cần"
            onChange={(e) => {
              setNote(e.target.value)
              setErr('')
            }}
            className="min-h-12 rounded-[14px] border-2 border-[#D9D5F2] px-3.5 text-base font-semibold text-ink"
          />
        </label>

        {err && <Notice tone="error">{err}</Notice>}
        {msg && <Notice tone="success">{msg}</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-muted">
            {selected.length
              ? `${isAdd ? 'Cộng' : 'Trừ'} ${amt} sao cho ${selected.length} học sinh`
              : 'Chưa chọn học sinh'}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={`min-h-14 cursor-pointer rounded-[18px] border-0 px-8 text-lg font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${goBg}`}
          >
            {isAdd ? 'Xác nhận cộng sao' : 'Xác nhận trừ sao'}
          </button>
        </div>
        <StarBurst playKey={flash} />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section data-testid="history" className={`${card} flex min-w-0 flex-[1_1_420px] flex-col gap-3 !p-6`}>
          <h2 className={h2}>Lịch sử giao dịch sao</h2>
          <div className="text-[13.5px] text-muted">Hoàn tác sẽ tạo thêm một bản ghi mới, không xóa bản ghi cũ.</div>
          {batches.map((b) => {
            const isReversal = b.kind === 'reversal'
            const done = isReversal || b.reversed
            const positive = b.delta > 0
            return (
              <div key={b.batchId} data-testid="history-row" className="flex items-center gap-3 rounded-2xl bg-bg px-3.5 py-2.5">
                <div
                  className={`min-w-[46px] shrink-0 rounded-xl px-2 py-1.5 text-center font-extrabold ${
                    positive ? 'bg-[#FFF1CC] text-[#7A4E00]' : 'bg-[#FFE3EE] text-[#9E2257]'
                  }`}
                >
                  {signed(b.delta)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-extrabold">{nameList(b.studentIds)}</div>
                  <div className="text-[13px] text-muted">
                    {b.reason} · {formatRelative(new Date(b.at), now)} · {b.actorName}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={done || pending}
                  onClick={() => undo(b.batchId)}
                  className="min-h-11 cursor-pointer rounded-xl border-[1.5px] border-[#D9D5F2] bg-white px-3 text-[13px] font-extrabold text-[#3441B5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReversal ? 'Đã ghi' : b.reversed ? 'Đã hoàn tác' : 'Hoàn tác'}
                </button>
              </div>
            )
          })}
          {batches.length === 0 && <div className="text-sm font-bold text-muted">Chưa có giao dịch nào.</div>}
        </section>

        <section data-testid="manage" className={`${card} flex min-w-0 flex-[1_1_320px] flex-col gap-3 !p-6`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={h2}>Quản lý tiêu chí</h2>
            <button
              type="button"
              onClick={() => openEditor()}
              className="min-h-11 cursor-pointer rounded-[14px] border-0 bg-primary-strong px-4 text-sm font-extrabold text-white"
            >
              + Thêm tiêu chí
            </button>
          </div>
          <div className="text-[13.5px] text-muted">Cô có thể sửa tên, số sao mặc định hoặc lưu trữ từng tiêu chí.</div>
          {manageList.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-[14px] bg-bg px-3 py-2">
              <span
                className={`min-w-9 shrink-0 rounded-[10px] px-2 py-1 text-center text-[13px] font-extrabold ${
                  c.kind === 'award' ? 'bg-[#FFF1CC] text-[#7A4E00]' : 'bg-[#FFE3EE] text-[#9E2257]'
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
                className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[#3441B5]"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Lưu trữ tiêu chí ${c.label}`}
                onClick={() => setArchiving(c)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[#B02A4B]"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
        </section>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Xác nhận trừ sao">
        <p className="m-0 mb-4 text-[15.5px] font-bold">
          Cô muốn trừ {amt} sao của {nameList(selected.map((s) => s.id))} với lý do &quot;{reasonText}&quot;?
        </p>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Hủy
          </Button>
          <Button variant="danger" disabled={pending} onClick={run}>
            Đồng ý trừ sao
          </Button>
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sửa tiêu chí' : editing?.kind === 'penalty' ? 'Thêm tiêu chí trừ sao' : 'Thêm tiêu chí cộng sao'}
      >
        <div className="flex flex-col gap-3">
          {fErr && <Notice tone="error">{fErr}</Notice>}
          <label className="flex flex-col gap-1.5 text-[14.5px] font-extrabold text-[#4A476E]">
            Tên tiêu chí
            <input
              type="text"
              value={fLabel}
              maxLength={200}
              onChange={(e) => setFLabel(e.target.value)}
              className="min-h-12 rounded-[14px] border-2 border-[#D9D5F2] px-3.5 text-base font-semibold text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[14.5px] font-extrabold text-[#4A476E]">
            Số sao mặc định
            <input
              type="number"
              min={1}
              max={100}
              value={fPoints}
              onChange={(e) => setFPoints(e.target.value)}
              className="min-h-12 w-[120px] rounded-[14px] border-2 border-[#D9D5F2] px-3.5 text-base font-semibold text-ink"
            />
          </label>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button disabled={pending} onClick={saveEditor}>
              Lưu tiêu chí
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={archiving !== null} onClose={() => setArchiving(null)} title="Lưu trữ tiêu chí">
        <p className="m-0 mb-4 text-[15.5px] font-bold">
          Cô muốn lưu trữ tiêu chí &quot;{archiving?.label}&quot;? Các bản ghi sao cũ vẫn được giữ.
        </p>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setArchiving(null)}>
            Hủy
          </Button>
          <Button variant="danger" disabled={pending} onClick={confirmArchive}>
            Đồng ý lưu trữ
          </Button>
        </div>
      </Modal>
    </>
  )
}
