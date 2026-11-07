import type { TransitionStartFunction } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { ArchivedClass } from '@/lib/backup/queries'
import { RestoreCard } from './RestoreCard'
import { action } from './shared'

export function BackupCard({
  archived,
  classId,
  pending,
  startTransition,
  setError,
}: {
  archived: ArchivedClass[]
  classId: string
  pending: boolean
  startTransition: TransitionStartFunction
  setError: (e: string | null) => void
}) {
  return (
    <>
      <h3 className="m-0 font-display text-lg font-extrabold">Sao lưu và khôi phục</h3>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <a href="/cai-dat/sao-luu" className={action}>
          <span className="flex items-center gap-2 text-base font-extrabold">
            <Icon d="M12 4v12M7 11l5 5 5-5M4 20h16" size={20} className="text-primary-ink" />
            Sao lưu dữ liệu
          </span>
          <span className="text-sm font-semibold leading-snug text-muted">
            Tải bản sao lưu toàn bộ lớp (học sinh, sao, điểm danh, quà).
          </span>
        </a>
        <RestoreCard classId={classId} pending={pending} startTransition={startTransition} setError={setError} />
      </div>

      {archived.length > 0 && (
        <>
          <h3 className="m-0 mt-1 font-display text-lg font-extrabold">Các năm học đã lưu trữ</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {archived.map((c) => (
              <li
                key={c.id}
                aria-label={`${c.className} · ${c.schoolYear}`}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-ctl border-2 border-edge bg-field px-3.5 py-1.5"
              >
                <span className="text-[15px] font-extrabold">
                  {c.className} · {c.schoolYear}
                </span>
                <a
                  href={`/cai-dat/sao-luu?lop=${c.id}`}
                  className="inline-flex min-h-11 items-center rounded-ctl border-2 border-primary-strong bg-white px-5 font-extrabold text-primary-strong no-underline hover:bg-primary-soft"
                >
                  Tải sao lưu
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
