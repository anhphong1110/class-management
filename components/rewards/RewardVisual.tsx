import { getRewardPreset } from '@/lib/rewards/presets'

export type RewardVisualValue = { kind: 'preset'; key: string } | { kind: 'image'; url: string }

/** Hình quà: ảnh tải lên hoặc hình có sẵn trên nền gradient. */
export function RewardVisual({
  visual,
  iconSize,
  className = '',
}: {
  visual: RewardVisualValue
  iconSize: number
  className?: string
}) {
  if (visual.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={visual.url} alt="" className={`object-cover ${className}`} />
    )
  }
  const preset = getRewardPreset(visual.key) ?? getRewardPreset('star')!
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: preset.gradient }}>
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        fill="rgba(255,255,255,.28)"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={preset.path} />
      </svg>
    </div>
  )
}
