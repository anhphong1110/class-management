import { describe, expect, it } from 'vitest'
import { REWARD_PRESETS, getRewardPreset } from '@/lib/rewards/presets'

describe('REWARD_PRESETS', () => {
  it('có đúng 8 mục theo thiết kế, key duy nhất', () => {
    expect(REWARD_PRESETS.map((p) => p.key)).toEqual(['star', 'book', 'pen', 'badge', 'gift', 'rocket', 'moon', 'heart'])
    expect(new Set(REWARD_PRESETS.map((p) => p.key)).size).toBe(8)
  })
  it('nhãn, path và gradient khớp thiết kế', () => {
    expect(REWARD_PRESETS[0]).toEqual({
      key: 'star',
      label: 'Ngôi sao',
      path: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
      gradient: 'linear-gradient(135deg,#6675E8,#B9A7F8)',
    })
    expect(REWARD_PRESETS[7]).toMatchObject({
      key: 'heart',
      label: 'Trái tim',
      gradient: 'linear-gradient(135deg,#E5334F,#FF9DB5)',
    })
    expect(REWARD_PRESETS[7].path.startsWith('M20.8 4.6a5.5')).toBe(true)
  })
  it('getRewardPreset trả null với key lạ', () => {
    expect(getRewardPreset('pen')?.label).toBe('Bút')
    expect(getRewardPreset('nope')).toBeNull()
    expect(getRewardPreset(null)).toBeNull()
  })
})
