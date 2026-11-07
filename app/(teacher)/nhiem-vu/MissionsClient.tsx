'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { toVietnameseMessage } from '@/lib/errors'
import { MISSION_PERIODS, MISSION_PERIOD_LABELS, type MissionPeriod } from '@/lib/missions/period'
import type { MissionsData } from '@/lib/missions/queries'
import { awardBadge, completeMission, revokeBadge, saveMission, setFeatureMissions, toggleMission, undoMissionCompletion } from './actions'

type Result = { error?: string; message?: string }
type Student = { id: string; fullName: string }
type Note = { tone: 'success' | 'error'; text: string } | null

const SPIN = 'M21 12a9 9 0 1 1-6.2-8.6'
const PAUSE = 'M10 5v14M14 5v14'

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
  const [revoking, setRevoking] = useState<MissionsData['badges'][number] | null>(null)
  const [undoing, setUndoing] = useState<{ id: string; mission: MissionsData['missions'][number]; studentName: string } | null>(null)
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

  function undo(u: NonNullable<typeof undoing>) {
    clearNotes()
    setUndoing(null)
    run(
      () => undoMissionCompletion(u.id),
      () => setGridNote({ tone: 'success', text: `Đã hoàn tác "${u.mission.name}" của ${u.studentName}.` }),
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

  function revoke(b: MissionsData['badges'][number]) {
    if (!person) return
    clearNotes()
    setRevoking(null)
    run(
      () => revokeBadge(b.id, person.id),
      () => setMsg(`Đã thu hồi "${b.name}" của ${person.fullName}.`),
      (text) => setBadgeNote({ tone: 'error', text }),
    )
  }

  const studentSelect = (aria: string) => (
    <Select
      aria-label={aria}
      value={who}
      disabled={busy || students.length === 0}
      onChange={(e) => setWho(e.target.value)}
      className="!w-auto min-w-[200px] text-[15px]"
    >
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.fullName}
        </option>
      ))}
    </Select>
  )
  const spinner = busy ? <Icon d={SPIN} size={16} className="motion-safe:animate-spin" /> : null

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 !py-4">
        <div className="min-w-0 flex-1 basis-72">
          <Switch
            checked={data.featureOn}
            onChange={toggleFeature}
            disabled={busy}
            label="Tính năng nhiệm vụ"
            hint="Tắt thì học sinh không thấy nhiệm vụ và huy hiệu."
          />
        </div>
        <Badge tone={data.featureOn ? 'success' : 'neutral'}>
          <Icon d={data.featureOn ? ICONS.checkCircle : PAUSE} size={14} />
          {data.featureOn ? 'Đang bật' : 'Đang tắt'}
        </Badge>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="m-0 font-display text-[22px] font-extrabold">Tạo nhiệm vụ mới</h2>
        <fieldset className="m-0 flex flex-col gap-3 rounded-ctl border-2 border-edge px-4 pb-4 pt-2">
          <legend className="px-2 text-sm font-extrabold text-primary-deep">Nội dung nhiệm vụ</legend>
          <div className="flex flex-wrap gap-3">
            <Field label="Tên nhiệm vụ" className="flex-[2_1_240px]">
              {(a) => (
                <Input
                  {...a}
                  type="text"
                  value={name}
                  disabled={busy}
                  maxLength={120}
                  onChange={(e) => {
                    setName(e.target.value)
                    setFormErr('')
                  }}
                  placeholder="Ví dụ: Đọc 2 cuốn sách trong tuần"
                />
              )}
            </Field>
            <Field label="Thời gian" className="flex-[1_1_150px]">
              {(a) => (
                <Select {...a} value={period} disabled={busy} onChange={(e) => setPeriod(e.target.value as MissionPeriod)}>
                  {MISSION_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {MISSION_PERIOD_LABELS[p]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Điều kiện hoàn thành">
            {(a) => (
              <Input
                {...a}
                type="text"
                value={condition}
                disabled={busy}
                maxLength={300}
                onChange={(e) => {
                  setCondition(e.target.value)
                  setFormErr('')
                }}
                placeholder="Ví dụ: Cô xác nhận sau khi em kể lại nội dung"
              />
            )}
          </Field>
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-3 rounded-ctl border-2 border-edge px-4 pb-4 pt-2">
          <legend className="px-2 text-sm font-extrabold text-primary-deep">Phần thưởng</legend>
          <Field
            label="Thưởng (sao)"
            hint="Nhiệm vụ không tự cộng sao, trừ khi cô nhập số sao thưởng (để 0 nếu chỉ trao huy hiệu)."
            className="max-w-[360px]"
          >
            {(a) => (
              <Input
                {...a}
                type="number"
                min={0}
                max={100}
                value={rewardStars}
                disabled={busy}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  setRewardStars(v >= 0 ? Math.min(v, 100) : 0)
                }}
              />
            )}
          </Field>
        </fieldset>
        <div className="flex justify-end">
          <Button size="lg" onClick={add} disabled={busy}>
            {spinner}
            + Thêm nhiệm vụ
          </Button>
        </div>
        {formErr ? <Notice tone="error">{formErr}</Notice> : null}
      </Card>

      <div className="flex flex-wrap items-center gap-2.5 text-[15px] font-extrabold text-ink">
        <span>Ghi nhận cho</span>
        {studentSelect('Ghi nhận cho')}
      </div>
      {gridNote ? <Notice tone={gridNote.tone}>{gridNote.text}</Notice> : null}

      {data.missions.length === 0 && (
        <EmptyState title="Chưa có nhiệm vụ nào" icon={ICONS.star}>
          Tạo nhiệm vụ đầu tiên ở phía trên để cả lớp cùng thử sức nhé.
        </EmptyState>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))' }}>
        {data.missions.map((m) => (
          <div
            key={m.id}
            data-testid="mission-card"
            className="clay-card flex flex-col gap-2 p-5"
            style={{ opacity: m.active ? 1 : 0.55 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-display text-[19px] font-extrabold leading-tight">{m.name}</div>
              <Badge>{MISSION_PERIOD_LABELS[m.period]}</Badge>
            </div>
            <div className="text-[15px] font-semibold leading-[1.45] text-muted">{m.condition}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="star">
                <Icon d={ICONS.star} size={14} />
                {m.rewardStars > 0 ? `+${m.rewardStars} sao khi hoàn thành` : 'Chỉ trao huy hiệu'}
              </Badge>
              <Badge tone={m.active ? 'success' : 'neutral'}>
                <Icon d={m.active ? ICONS.checkCircle : PAUSE} size={14} />
                {m.active ? 'Đang mở' : 'Đã tạm dừng'}
              </Badge>
            </div>
            <div className="text-[13px] font-bold text-muted">
              {m.doneCount}/{data.studentCount} bạn đã hoàn thành
            </div>
            {m.completions.length > 0 && (
              <ul data-testid="completion-list" className="m-0 flex list-none flex-col gap-1.5 p-0">
                {m.completions.map((c) => {
                  const studentName = students.find((s) => s.id === c.studentId)?.fullName ?? ''
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-field py-1 pl-3 pr-1.5">
                      <span className="min-w-0 truncate text-sm font-bold">{studentName}</span>
                      <Button
                        variant="ghost"
                        aria-label={`Hoàn tác ${m.name} của ${studentName}`}
                        disabled={busy}
                        onClick={() => setUndoing({ id: c.id, mission: m, studentName })}
                        className="shrink-0 !px-3 text-sm text-danger-deep hover:!bg-danger-soft hover:!text-danger-deep"
                      >
                        <Icon d={ICONS.undo} size={16} />
                        Hoàn tác
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <Button className="flex-1" onClick={() => done(m)} disabled={busy || noPerson || !m.active}>
                <Icon d={ICONS.check} size={18} />
                Ghi nhận thêm 1 bạn
              </Button>
              <Button variant="secondary" onClick={() => toggle(m.id)} disabled={busy}>
                {m.active ? 'Tạm dừng' : 'Mở lại'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Card className="flex flex-col gap-3.5">
        <h2 className="m-0 font-display text-[22px] font-extrabold">Huy hiệu</h2>
        {msg ? <Notice tone="success">{msg}</Notice> : null}
        {badgeNote ? <Notice tone={badgeNote.tone}>{badgeNote.text}</Notice> : null}
        <div className="flex flex-wrap items-center gap-2.5 text-[15px] font-extrabold text-ink">
          <label className="flex items-center gap-2">
            Trao cho
            {studentSelect('Trao cho')}
          </label>
          <span className="text-sm font-semibold text-muted">
            rồi bấm &quot;Trao huy hiệu&quot; ở huy hiệu muốn trao.
          </span>
        </div>
        {data.badges.length === 0 && (
          <EmptyState title="Chưa có huy hiệu nào" icon={ICONS.trophy}>
            Huy hiệu của lớp sẽ hiện ở đây.
          </EmptyState>
        )}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {data.badges.map((b) => (
            <div
              key={b.id}
              data-testid="badge-card"
              className="flex flex-col items-center gap-1.5 rounded-panel border-2 border-edge bg-field p-4 text-center"
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
              <Button variant="secondary" className="w-full" onClick={() => give(b)} disabled={busy || noPerson}>
                Trao huy hiệu
              </Button>
              <Button
                variant="ghost"
                className="w-full text-danger-deep hover:!bg-danger-soft hover:!text-danger-deep"
                onClick={() => setRevoking(b)}
                disabled={busy || noPerson || !person || !b.holderIds.includes(person.id)}
              >
                Thu hồi
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog
        open={undoing !== null}
        title="Hoàn tác nhiệm vụ"
        message={
          undoing
            ? `Cô muốn hoàn tác việc ghi nhận "${undoing.mission.name}" cho ${undoing.studentName}?${undoing.mission.rewardStars > 0 ? ` Số sao thưởng (${undoing.mission.rewardStars}) sẽ được trừ lại.` : ''}`
            : ''
        }
        confirmLabel="Đồng ý hoàn tác"
        cancelLabel="Hủy"
        danger
        pending={busy}
        onCancel={() => setUndoing(null)}
        onConfirm={() => undoing && undo(undoing)}
      />

      <ConfirmDialog
        open={revoking !== null}
        title="Thu hồi huy hiệu"
        message={revoking ? `Cô muốn thu hồi huy hiệu "${revoking.name}" của ${person?.fullName ?? ''}?` : ''}
        confirmLabel="Đồng ý thu hồi"
        cancelLabel="Hủy"
        danger
        pending={busy}
        onCancel={() => setRevoking(null)}
        onConfirm={() => revoking && revoke(revoking)}
      />
    </div>
  )
}
