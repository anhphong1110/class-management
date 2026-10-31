import { describe, expect, it } from 'vitest'
import { buildPool, pickNext } from '@/lib/random/pick'

const students = [
  { id: 'a', groupId: 'g1', presentToday: true },
  { id: 'b', groupId: 'g1', presentToday: false },
  { id: 'c', groupId: 'g2', presentToday: true },
  { id: 'd', groupId: null, presentToday: true },
]

describe('buildPool', () => {
  it('Cả lớp, tắt "chỉ có mặt": lấy tất cả', () => {
    expect(buildPool(students, { scope: 'all', onlyPresent: false })).toEqual(['a', 'b', 'c', 'd'])
  })
  it('lọc theo tổ', () => {
    expect(buildPool(students, { scope: 'g1', onlyPresent: false })).toEqual(['a', 'b'])
    expect(buildPool(students, { scope: 'g2', onlyPresent: false })).toEqual(['c'])
  })
  it('bỏ bạn vắng khi onlyPresent', () => {
    expect(buildPool(students, { scope: 'all', onlyPresent: true })).toEqual(['a', 'c', 'd'])
    expect(buildPool(students, { scope: 'g1', onlyPresent: true })).toEqual(['a'])
  })
  it('cô chưa điểm danh (ai cũng presentToday) thì không loại ai', () => {
    const none = students.map((s) => ({ ...s, presentToday: true }))
    expect(buildPool(none, { scope: 'all', onlyPresent: true })).toHaveLength(4)
  })
  it('tổ không có ai trả về rỗng', () => {
    expect(buildPool(students, { scope: 'g9', onlyPresent: false })).toEqual([])
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
