import { describe, expect, it } from 'vitest'
import { givenNameKey, matchesSearch, normalizeVn } from '@/lib/domain/vn-text'

const fields = ['Phạm Đức Dũng', 'HS04']

describe('vn-text', () => {
  it('normalizes', () => expect(normalizeVn('Đỗ Anh THƯ')).toBe('do anh thu'))
  it('matches without diacritics', () => expect(matchesSearch('dung', fields)).toBe(true))
  it('matches code', () => expect(matchesSearch('hs04', fields)).toBe(true))
  it('matches with diacritics and caps', () => expect(matchesSearch('DŨNG', fields)).toBe(true))
  it('rejects', () => expect(matchesSearch('lan', fields)).toBe(false))
  it('empty query matches', () => {
    expect(matchesSearch('', fields)).toBe(true)
    expect(matchesSearch('   ', fields)).toBe(true)
  })
  it('sorts by given name', () => {
    const names = ['Nguyễn Minh Anh', 'Trần Gia Bảo', 'Đỗ Anh Thư']
    const sorted = [...names].sort((a, b) => givenNameKey(a).localeCompare(givenNameKey(b), 'vi'))
    expect(sorted).toEqual(['Nguyễn Minh Anh', 'Trần Gia Bảo', 'Đỗ Anh Thư'])
  })
  it('sorts by given name, reordering', () => {
    const names = ['Đỗ Anh Thư', 'Trần Gia Bảo', 'Nguyễn Minh Anh']
    const sorted = [...names].sort((a, b) => givenNameKey(a).localeCompare(givenNameKey(b), 'vi'))
    expect(sorted).toEqual(['Nguyễn Minh Anh', 'Trần Gia Bảo', 'Đỗ Anh Thư'])
  })
})
