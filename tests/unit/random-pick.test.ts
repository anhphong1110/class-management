import { describe, expect, it } from 'vitest'
import { buildPool, pickNext } from '@/lib/random/pick'

const students = [
  { id: 'a', groupId: 'g1' },
  { id: 'b', groupId: 'g1' },
  { id: 'c', groupId: 'g2' },
  { id: 'd', groupId: null },
]

describe('buildPool', () => {
  it('Cả lớp: lấy tất cả', () => {
    expect(buildPool(students, { scope: 'all' })).toEqual(['a', 'b', 'c', 'd'])
  })
  it('lọc theo tổ', () => {
    expect(buildPool(students, { scope: 'g1' })).toEqual(['a', 'b'])
    expect(buildPool(students, { scope: 'g2' })).toEqual(['c'])
  })
  it('tổ không có ai trả về rỗng', () => {
    expect(buildPool(students, { scope: 'g9' })).toEqual([])
  })
})

describe('pickNext', () => {
  const pool = ['a', 'b', 'c', 'd']
  it('chọn theo rand đã tiêm', () => {
    expect(pickNext(pool, [], true, () => 0)).toBe('a')
    expect(pickNext(pool, [], true, () => 0.5)).toBe('c')
    expect(pickNext(pool, [], true, () => 0.999999)).toBe('d')
  })
  it('noRepeat loại bạn đã gọi', () => {
    expect(pickNext(pool, ['a', 'b'], true, () => 0)).toBe('c')
    expect(pickNext(pool, ['a', 'b'], true, () => 0.999)).toBe('d')
  })
  it('tắt noRepeat thì vẫn có thể gọi lại', () => {
    expect(pickNext(pool, ['a'], false, () => 0)).toBe('a')
  })
  it('hết người trả null', () => {
    expect(pickNext(pool, pool, true, () => 0)).toBeNull()
    expect(pickNext([], [], false, () => 0)).toBeNull()
  })
  it('bỏ qua id đã gọi không còn trong phạm vi', () => {
    expect(pickNext(['a'], ['zzz'], true, () => 0)).toBe('a')
  })
})
