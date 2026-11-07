export type Mode = 'add' | 'sub'

export const SUB_MAX = 5
export const card = 'clay-card p-[22px_24px]'
export const h2 = 'm-0 font-display text-[22px] font-extrabold'
export const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'

export function defaultAmount(mode: Mode, steps: number[]): number {
  const list = mode === 'add' ? steps : steps.filter((n) => n <= SUB_MAX)
  const preferred = mode === 'add' ? 2 : 1
  return list.includes(preferred) ? preferred : (list[0] ?? preferred)
}

export function signed(n: number): string {
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}`
}

export const chip = (on: boolean) =>
  on
    ? 'border-primary-strong bg-primary-soft text-primary-deep'
    : 'border-edge bg-white text-ink hover:bg-primary-soft'
