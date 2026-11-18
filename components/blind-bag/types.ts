import type { RewardVisualValue } from '@/components/rewards/RewardVisual'

/** Món quà vừa bốc được; tier 0..4 quyết định màu viền thẻ và độ hoành tráng của pháo hoa. */
export type RevealGift = { name: string; visual: RewardVisualValue; tier: number }
