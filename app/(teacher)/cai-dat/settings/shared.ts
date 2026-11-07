import type { SettingsFlags } from '@/lib/settings/queries'

export type Msg = { tone: 'success' | 'error'; text: string }
export type FlagKey = { [K in keyof SettingsFlags]: SettingsFlags[K] extends boolean ? K : never }[keyof SettingsFlags]
export type UploadKind = 'logo_path' | 'class_logo_path' | 'cover_path'

export const card = 'clay-card flex flex-col gap-3.5 px-6 py-[22px]'
export const h2 = 'm-0 font-display text-[22px] font-extrabold'
export const row = 'rounded-2xl border-2 border-edge bg-field px-3.5 py-1.5'
