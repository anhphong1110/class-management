import { Select } from '@/components/ui/Field'
import type { Student } from './shared'

export function StudentSelect({
  aria,
  who,
  students,
  busy,
  onChange,
}: {
  aria: string
  who: string
  students: Student[]
  busy: boolean
  onChange: (id: string) => void
}) {
  return (
    <Select
      aria-label={aria}
      value={who}
      disabled={busy || students.length === 0}
      onChange={(e) => onChange(e.target.value)}
      className="!w-auto min-w-[200px] text-[15px]"
    >
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.fullName}
        </option>
      ))}
    </Select>
  )
}
