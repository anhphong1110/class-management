import { expect, it } from 'vitest'
import { callName } from '@/lib/domain/name'

it('lấy hai chữ cuối', () => {
  expect(callName('Võ Hà My')).toBe('Hà My')
  expect(callName('  Minh  ')).toBe('Minh')
})
