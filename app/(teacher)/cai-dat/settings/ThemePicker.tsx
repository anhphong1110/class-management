import { Icon, ICONS } from '@/components/ui/Icon'
import { THEMES, type ThemeKey } from '@/lib/domain/theme'

export function ThemePicker({ theme, pending, onPick }: { theme: ThemeKey; pending: boolean; onPick: (key: ThemeKey) => void }) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const t = THEMES[key]
        const on = key === theme
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={pending}
            onClick={() => onPick(key)}
            className={`flex min-h-[44px] cursor-pointer flex-col gap-2.5 rounded-panel border-2 p-3 text-left text-[15px] font-extrabold text-ink transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
              on ? 'border-ink shadow-[0_4px_0_var(--color-ink)]' : 'border-edge shadow-ledge'
            }`}
            style={{ background: t.bg }}
          >
            <span className="flex items-center justify-between gap-2">
              {t.label}
              {on && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-xs font-extrabold text-white">
                  <Icon d={ICONS.check} size={12} />
                  Đang dùng
                </span>
              )}
            </span>
            <span aria-hidden="true" className="flex items-center gap-1.5">
              <span className="size-7 rounded-full border-2 border-white" style={{ background: t.primary }} />
              <span className="size-7 rounded-full border-2 border-white" style={{ background: t.strong }} />
              <span className="size-7 rounded-full border-2" style={{ background: t.soft, borderColor: t.edge }} />
              <span
                className="ml-auto rounded-full px-3 py-1 text-xs font-extrabold text-white"
                style={{ background: t.strong, boxShadow: `0 3px 0 ${t.deep}` }}
              >
                Nút mẫu
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
