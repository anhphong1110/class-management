import Link from 'next/link'
import { Field, Input } from '@/components/ui/Field'
import type { SettingsFlags } from '@/lib/settings/queries'
import { card, h2, type FlagKey } from './shared'
import { StarStepsEditor } from './StarStepsEditor'
import { SwitchRow } from './SwitchRow'

const RULES: [FlagKey, string, string][] = [
  ['require_approval', 'Giáo viên duyệt mọi yêu cầu đổi quà', 'Tắt thì học sinh đổi quà xong là trừ sao ngay'],
  ['reserve_on_request', 'Giữ trước sao và quà khi gửi yêu cầu', 'Tránh bán vượt số lượng quà'],
  ['only_enough', 'Chỉ cho đổi khi đủ sao khả dụng', 'Không bao giờ để số dư sao âm'],
]

type StepsProps = Parameters<typeof StarStepsEditor>[0]

export function RulesSection({
  settings,
  pending,
  onFlip,
  limit,
  setLimit,
  onSaveLimit,
  steps,
}: {
  settings: SettingsFlags
  pending: boolean
  onFlip: (key: FlagKey, next: boolean) => void
  limit: string
  setLimit: (v: string) => void
  onSaveLimit: () => void
  steps: StepsProps
}) {
  return (
    <section className={`${card} min-w-0 flex-[1_1_380px]`} aria-labelledby="rules-h">
      <h2 id="rules-h" className={h2}>
        Quy định thi đua và đổi quà
      </h2>
      {RULES.map(([k, label, hint]) => (
        <SwitchRow key={k} flagKey={k} label={label} hint={hint} settings={settings} pending={pending} onFlip={onFlip} />
      ))}
      <p className="m-0 text-sm font-semibold text-muted">
        Khi &quot;Giữ trước sao&quot; bật, học sinh luôn cần đủ sao để gửi yêu cầu. &quot;Chỉ cho đổi khi đủ sao&quot; chỉ có tác dụng khi &quot;Giữ trước sao&quot; tắt.
      </p>
      <Field label="Tối đa lượt đổi quà mỗi tuần" className="max-w-[240px]">
        {(a) => (
          <Input
            {...a}
            type="number"
            value={limit}
            disabled={pending}
            onChange={(e) => setLimit(e.target.value)}
            onBlur={onSaveLimit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
        )}
      </Field>
      <StarStepsEditor {...steps} />
      <Link href="/thi-dua" className="inline-flex min-h-11 items-center text-[15px] font-extrabold text-primary-strong">
        Sửa tiêu chí cộng/trừ sao ở Trạm thi đua
      </Link>
    </section>
  )
}
