import { Switch } from '@/components/ui/Switch'
import type { SettingsFlags } from '@/lib/settings/queries'
import { row, type FlagKey } from './shared'

export function SwitchRow({
  flagKey,
  label,
  hint,
  settings,
  pending,
  onFlip,
}: {
  flagKey: FlagKey
  label: string
  hint?: string
  settings: SettingsFlags
  pending: boolean
  onFlip: (key: FlagKey, next: boolean) => void
}) {
  return (
    <div className={row}>
      <Switch checked={settings[flagKey]} onChange={(next) => onFlip(flagKey, next)} label={label} hint={hint} disabled={pending} />
    </div>
  )
}
