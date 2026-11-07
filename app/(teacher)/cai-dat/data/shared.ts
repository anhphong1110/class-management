export const card = 'clay-card flex flex-col gap-3.5 px-6 py-[22px]'
export const action =
  'clay-press flex min-h-24 cursor-pointer flex-col gap-1 rounded-panel border-2 border-edge bg-field px-4 py-3.5 text-left text-ink no-underline [--edge:var(--primary-edge)] hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50'

/** Lỗi chuyển hướng của Server Action phải đi tiếp để trình duyệt chuyển trang, không được báo như lỗi thường. */
export function isRedirect(e: unknown) {
  return typeof (e as { digest?: unknown })?.digest === 'string' && (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')
}

export type Current = { schoolYear: string; className: string; teacherName: string }
