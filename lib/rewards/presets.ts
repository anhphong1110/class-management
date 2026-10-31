export type RewardPreset = { key: string; label: string; path: string; gradient: string }

/** 8 hình có sẵn của thiết kế `Rewards.dc.html`; `rewards.icon` lưu `key`. */
export const REWARD_PRESETS: RewardPreset[] = [
  { key: 'star', label: 'Ngôi sao', path: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', gradient: 'linear-gradient(135deg,#6675E8,#B9A7F8)' },
  { key: 'book', label: 'Sách', path: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6', gradient: 'linear-gradient(135deg,#F46FA5,#FFB4D3)' },
  { key: 'pen', label: 'Bút', path: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', gradient: 'linear-gradient(135deg,#2BB5A4,#80DDD0)' },
  { key: 'badge', label: 'Huy hiệu', path: 'M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 13.5L7 22l5-3 5 3-1.5-8.5', gradient: 'linear-gradient(135deg,#F5A81C,#FFD76F)' },
  { key: 'gift', label: 'Hộp quà', path: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z', gradient: 'linear-gradient(135deg,#4F5BD5,#F46FA5)' },
  { key: 'rocket', label: 'Tên lửa', path: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5', gradient: 'linear-gradient(135deg,#3B3FA8,#7A58E0)' },
  { key: 'moon', label: 'Mặt trăng', path: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z', gradient: 'linear-gradient(135deg,#8E86D8,#D9D3FF)' },
  { key: 'heart', label: 'Trái tim', path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z', gradient: 'linear-gradient(135deg,#E5334F,#FF9DB5)' },
]

export const REWARD_PRESET_KEYS = REWARD_PRESETS.map((p) => p.key)

export function getRewardPreset(key: string | null | undefined): RewardPreset | null {
  return REWARD_PRESETS.find((p) => p.key === key) ?? null
}
