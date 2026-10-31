'use client'

import { useState, useTransition } from 'react'
import { Notice } from '@/components/ui/Notice'
import { Toggle } from '@/components/ui/Toggle'
import { toVietnameseMessage } from '@/lib/errors'
import { MISSION_PERIODS, MISSION_PERIOD_LABELS, type MissionPeriod } from '@/lib/missions/period'
import type { MissionsData } from '@/lib/missions/queries'
import { awardBadge, completeMission, saveMission, setFeatureMissions, toggleMission } from './actions'

type Result = { error?: string; message?: string }
type Student = { id: string; fullName: string }
type Note = { tone: 'success' | 'error'; text: string } | null

const card = 'rounded-[26px] bg-white p-6 shadow-[0_6px_20px_rgba(102,117,232,.10)]'
const label = 'flex flex-col gap-1 text-sm font-extrabold text-[#4A476E]'
const field =
  'min-h-12 box-border rounded-xl border-2 border-[#D9D5F2] bg-white px-3.5 text-base font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50'
const ghost =
  'cursor-pointer rounded-xl border-[1.5px] border-[#D9D5F2] bg-white font-extrabold text-[#3441B5] disabled:cursor-not-allowed disabled:opacity-50'

export function MissionsClient({ data, students }: { data: MissionsData; students: Student[] }) {
  const [name, setName] = useState('')
  const [condition, setCondition] = useState('')
  const [rewardStars, setRewardStars] = useState(0)
  const [period, setPeriod] = useState<MissionPeriod>('week')
  const [who, setWho] = useState(students[0]?.id ?? '')
  const [formErr, setFormErr] = useState('')
  const [gridNote, setGridNote] = useState<Note>(null)
  const [badgeNote, setBadgeNote] = useState<Note>(null)
  const [msg, setMsg] = useState('')
  const [busy, startTransition] = useTransition()

  const person = students.find((s) => s.id === who) ?? null
  const noPerson = !person

  function clearNotes() {
    setFormErr('')
    setGridNote(null)
    setBadgeNote(null)
    setMsg('')
  }

  /** Chạy một Server Action; lỗi mạng hay lỗi bất ngờ hiện thành câu thông thường thay vì làm hỏng trang. */
  function run(action: () => Promise<Result>, onDone: (res: Result) => void, onFail: (text: string) => void) {
    startTransition(async () => {
      try {
        const res = await action()
        if (res.error) onFail(res.error)
        else onDone(res)
      } catch {
        onFail(toVietnameseMessage('unexpected'))
      }
    })
  }

  function add() {
    clearNotes()
    if (!name.trim() || !condition.trim()) {
      setFormErr(toVietnameseMessage('mission_required'))
      return
    }
    run(
      () => saveMission({ name, period, condition, rewardStars }),
      (res) => {
        setName('')
        setCondition('')
        setRewardStars(0)
        setMsg(res.message ?? '')
      },
      setFormErr,
    )
  }

  function toggleFeature(next: boolean) {
    clearNotes()
    run(
      () => setFeatureMissions(next),
      () => {},
      (text) => setGridNote({ tone: 'error', text }),
    )
  }

  function done(m: MissionsData['missions'][number]) {
    if (!person) return
    clearNotes()
    run(
      () => completeMission(m.id, person.id),
      () =>
        setGridNote({
          tone: 'success',
          text: `Đã ghi nhận "${m.name}" cho ${person.fullName}.${m.rewardStars > 0 ? ` Cộng ${m.rewardStars} sao thi đua.` : ''}`,
        }),
      (text) => setGridNote({ tone: 'error', text }),
    )
  }

  function toggle(id: string) {
    clearNotes()
    run(
      () => toggleMission(id),
      () => {},
      (text) => setGridNote({ tone: 'error', text }),
    )
  }

  function give(b: MissionsData['badges'][number]) {
    if (!person) return
    clearNotes()
    run(
      () => awardBadge(b.id, person.id),
      () => setMsg(`Đã trao "${b.name}" cho ${person.fullName}. Huy hiệu không tự cộng sao.`),
      (text) => setBadgeNote({ tone: 'error', text }),
    )
  }

  const studentSelect = (aria: string) => (
    <select
      aria-label={aria}
      value={who}
      disabled={busy || students.length === 0}
      onChange={(e) => setWho(e.target.value)}
      className={`${field} text-[15px]`}
    >
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.fullName}
        </option>
      ))}
    </select>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 !py-4`}>
        <div className="min-w-0 flex-1 basis-72">
          <Toggle
            checked={data.featureOn}
            onChange={toggleFeature}
            disabled={busy}
            label="Tính năng nhiệm vụ"
            hint="Tắt thì học sinh không thấy nhiệm vụ và huy hiệu."
          />
        </div>
        <span className="text-[14.5px] font-extrabold text-ink">{data.featureOn ? 'Đang bật' : 'Đang tắt'}</span>
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className="m-0 font-display text-[22px] font-extrabold">Tạo nhiệm vụ mới</h2>
        <div className="flex flex-wrap gap-3">
          <label className={`${label} flex-[2_1_240px]`}>
            Tên nhiệm vụ
            <input
              type="text"
              value={name}
              disabled={busy}
              maxLength={120}
              onChange={(e) => {
                setName(e.target.value)
                setFormErr('')
              }}
              placeholder="Ví dụ: Đọc 2 cuốn sách trong tuần"
              className={field}
            />
          </label>
          <label className={`${label} flex-[1_1_150px]`}>
            Thời gian
            <select
              value={period}
              disabled={busy}
              onChange={(e) => setPeriod(e.target.value as MissionPeriod)}
              className={field}
            >
              {MISSION_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {MISSION_PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className={`${label} flex-[1_1_130px]`}>
            Thưởng (sao)
            <input
              type="number"
              min={0}
              max={100}
              value={rewardStars}
              disabled={busy}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setRewardStars(v >= 0 ? Math.min(v, 100) : 0)
              }}
              className={field}
            />
          </label>
        </div>
        <label className={label}>
          Điều kiện hoàn thành
          <input
            type="text"
            value={condition}
            disabled={busy}
            maxLength={300}
            onChange={(e) => {
              setCondition(e.target.value)
              setFormErr('')
            }}
            placeholder="Ví dụ: Cô xác nhận sau khi em kể lại nội dung"
            className={`${field} font-semibold`}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="max-w-[520px] text-[13.5px] text-muted">
            Nhiệm vụ không tự cộng sao, trừ khi cô nhập số sao thưởng (để 0 nếu chỉ trao huy hiệu).
          </div>
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="min-h-[52px] cursor-pointer rounded-[14px] border-0 bg-[#4F5BD5] px-[26px] text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Thêm nhiệm vụ
          </button>
        </div>
        {formErr ? <Notice tone="error">{formErr}</Notice> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-[14.5px] font-extrabold text-[#4A476E]">
        <span>Ghi nhận cho</span>
        {studentSelect('Ghi nhận cho')}
      </div>
      {gridNote ? <Notice tone={gridNote.tone}>{gridNote.text}</Notice> : null}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))' }}>
        {data.missions.map((m) => (
          <div
            key={m.id}
            data-testid="mission-card"
            className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-[0_6px_20px_rgba(102,117,232,.10)]"
            style={{ opacity: m.active ? 1 : 0.55 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-display text-[19px] font-extrabold leading-tight">{m.name}</div>
              <span className="shrink-0 rounded-full bg-[#E8EBFF] px-3 py-[3px] text-[12.5px] font-extrabold text-[#2C37A8]">
                {MISSION_PERIOD_LABELS[m.period]}
              </span>
            </div>
            <div className="text-sm leading-[1.45] text-[#4A476E]">{m.condition}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FFF1CC] px-3 py-[3px] text-[13px] font-extrabold text-[#6E4700]">
                {m.rewardStars > 0 ? `+${m.rewardStars} sao khi hoàn thành` : 'Chỉ trao huy hiệu'}
              </span>
              <span className="text-[13px] font-bold text-muted">
                {m.doneCount}/{data.studentCount} bạn đã hoàn thành
              </span>
            </div>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => done(m)}
                disabled={busy || noPerson || !m.active}
                className="min-h-[46px] flex-1 cursor-pointer rounded-xl border-0 bg-[#12794F] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ghi nhận thêm 1 bạn
              </button>
              <button
                type="button"
                onClick={() => toggle(m.id)}
                disabled={busy}
                className={`${ghost} min-h-[46px] px-3.5 text-sm`}
              >
                {m.active ? 'Tạm dừng' : 'Mở lại'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={`${card} flex flex-col gap-3.5 !rounded-[28px]`}>
        <h2 className="m-0 font-display text-[22px] font-extrabold">Huy hiệu</h2>
        {msg ? <Notice tone="success">{msg}</Notice> : null}
        {badgeNote ? <Notice tone={badgeNote.tone}>{badgeNote.text}</Notice> : null}
        <div className="flex flex-wrap items-center gap-2.5 text-[14.5px] font-extrabold text-[#4A476E]">
          <label className="flex items-center gap-2">
            Trao cho
            {studentSelect('Trao cho')}
          </label>
          <span className="text-[13.5px] font-semibold text-muted">
            rồi bấm &quot;Trao huy hiệu&quot; ở huy hiệu muốn trao.
          </span>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {data.badges.map((b) => (
            <div
              key={b.id}
              data-testid="badge-card"
              className="flex flex-col items-center gap-1.5 rounded-[20px] bg-[#F6F4FF] p-4 text-center"
            >
              <div
                className="flex h-[68px] w-[68px] items-center justify-center rounded-full"
                style={{ background: b.gradient }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="34"
                  height="34"
                  fill="rgba(255,255,255,.3)"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={b.icon} />
                </svg>
              </div>
              <div className="text-[15px] font-extrabold leading-tight">{b.name}</div>
              <div className="text-[13px] font-bold text-muted">{b.count} bạn đã đạt</div>
              <button
                type="button"
                onClick={() => give(b)}
                disabled={busy || noPerson}
                className={`${ghost} min-h-11 w-full text-[13.5px]`}
              >
                Trao huy hiệu
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
