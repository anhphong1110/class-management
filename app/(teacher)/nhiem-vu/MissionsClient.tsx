'use client'

import { useState, useTransition } from 'react'
import { Badge as Pill } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/Notice'
import { Switch } from '@/components/ui/Switch'
import { toVietnameseMessage } from '@/lib/errors'
import type { MissionPeriod } from '@/lib/missions/period'
import type { MissionsData } from '@/lib/missions/queries'
import { awardBadge, completeMission, revokeBadge, saveMission, setFeatureMissions, toggleMission, undoMissionCompletion } from './actions'
import { BadgeSection } from './missions/BadgeSection'
import { MissionDialogs } from './missions/MissionDialogs'
import { MissionForm } from './missions/MissionForm'
import { MissionList } from './missions/MissionList'
import { PAUSE, type Badge, type Mission, type Note, type Student, type Undoing } from './missions/shared'
import { StudentSelect } from './missions/StudentSelect'

type Result = { error?: string; message?: string }

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
  const [revoking, setRevoking] = useState<Badge | null>(null)
  const [undoing, setUndoing] = useState<Undoing | null>(null)
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

  function done(m: Mission) {
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

  function undo(u: Undoing) {
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

  function give(b: Badge) {
    if (!person) return
    clearNotes()
    run(
      () => awardBadge(b.id, person.id),
      () => setMsg(`Đã trao "${b.name}" cho ${person.fullName}. Huy hiệu không tự cộng sao.`),
      (text) => setBadgeNote({ tone: 'error', text }),
    )
  }

  function revoke(b: Badge) {
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
    <StudentSelect aria={aria} who={who} students={students} busy={busy} onChange={setWho} />
  )

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
        <Pill tone={data.featureOn ? 'success' : 'neutral'}>
          <Icon d={data.featureOn ? ICONS.checkCircle : PAUSE} size={14} />
          {data.featureOn ? 'Đang bật' : 'Đang tắt'}
        </Pill>
      </Card>

      <MissionForm
        name={name}
        setName={setName}
        condition={condition}
        setCondition={setCondition}
        rewardStars={rewardStars}
        setRewardStars={setRewardStars}
        period={period}
        setPeriod={setPeriod}
        busy={busy}
        formErr={formErr}
        clearFormErr={() => setFormErr('')}
        onAdd={add}
      />

      <div className="flex flex-wrap items-center gap-2.5 text-[15px] font-extrabold text-ink">
        <span>Ghi nhận cho</span>
        {studentSelect('Ghi nhận cho')}
      </div>
      {gridNote ? <Notice tone={gridNote.tone}>{gridNote.text}</Notice> : null}

      <MissionList
        missions={data.missions}
        studentCount={data.studentCount}
        students={students}
        busy={busy}
        noPerson={noPerson}
        onDone={done}
        onToggle={toggle}
        onAskUndo={setUndoing}
      />

      <BadgeSection
        badges={data.badges}
        msg={msg}
        badgeNote={badgeNote}
        studentSelect={studentSelect('Trao cho')}
        personId={person?.id ?? null}
        busy={busy}
        noPerson={noPerson}
        onGive={give}
        onAskRevoke={setRevoking}
      />

      <MissionDialogs
        undoing={undoing}
        revoking={revoking}
        personName={person?.fullName ?? ''}
        busy={busy}
        onCancelUndo={() => setUndoing(null)}
        onConfirmUndo={undo}
        onCancelRevoke={() => setRevoking(null)}
        onConfirmRevoke={revoke}
      />
    </div>
  )
}
