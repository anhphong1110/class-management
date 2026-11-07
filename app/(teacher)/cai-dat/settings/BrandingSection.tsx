import type { MutableRefObject } from 'react'
import type { ThemeKey } from '@/lib/domain/theme'
import { ThemePicker } from './ThemePicker'
import { card, h2, type UploadKind } from './shared'

const UPLOADS: [UploadKind, string, string, number][] = [
  ['logo_path', 'Tải lên logo trường', 'upload-logo', 512],
  ['class_logo_path', 'Tải lên logo lớp', 'upload-class-logo', 512],
  ['cover_path', 'Tải lên ảnh bìa lớp', 'upload-cover', 1600],
]

export function BrandingSection({
  fileRefs,
  theme,
  pending,
  onFile,
  onPickTheme,
}: {
  fileRefs: MutableRefObject<Partial<Record<UploadKind, HTMLInputElement | null>>>
  theme: ThemeKey
  pending: boolean
  onFile: (kind: UploadKind, maxSide: number, file: File | undefined) => void
  onPickTheme: (key: ThemeKey) => void
}) {
  return (
    <section className={card} aria-labelledby="look-h">
      <h2 id="look-h" className={h2}>
        Logo, ảnh bìa và màu giao diện
      </h2>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {UPLOADS.map(([kind, label, testId, maxSide]) => (
          <div key={kind}>
            <input
              ref={(el) => {
                fileRefs.current[kind] = el
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-testid={testId}
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
              onChange={(e) => onFile(kind, maxSide, e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRefs.current[kind]?.click()}
              className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-panel border-2 border-dashed border-primary bg-bg p-2.5 text-center text-sm font-extrabold text-primary-ink transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
              </svg>
              {label}
            </button>
          </div>
        ))}
      </div>
      <div className="text-[15px] font-extrabold text-ink">Màu chủ đạo</div>
      <ThemePicker theme={theme} pending={pending} onPick={onPickTheme} />
    </section>
  )
}
