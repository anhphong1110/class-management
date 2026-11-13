import { describe, expect, it } from 'vitest'
import { resolveRoute } from '@/lib/auth/route-guard'

const redirect = (to: string) => ({ action: 'redirect', to })

describe('resolveRoute', () => {
  it('chưa đăng nhập vào khu giáo viên -> đăng nhập kèm next', () => {
    expect(resolveRoute({ pathname: '/tong-quan', role: null })).toEqual(
      redirect('/dang-nhap?next=%2Ftong-quan'),
    )
  })
  it('chưa đăng nhập vào khu học sinh -> đăng nhập kèm next', () => {
    expect(resolveRoute({ pathname: '/em', role: null })).toEqual(redirect('/dang-nhap?next=%2Fem'))
  })
  it('học sinh vào khu giáo viên -> /em', () => {
    expect(resolveRoute({ pathname: '/tong-quan', role: 'student' })).toEqual(redirect('/em'))
    expect(resolveRoute({ pathname: '/trinh-chieu', role: 'student' })).toEqual(redirect('/em'))
    expect(resolveRoute({ pathname: '/hoc-sinh/abc', role: 'student' })).toEqual(redirect('/em'))
  })
  it('giáo viên vào khu học sinh được phép', () => {
    expect(resolveRoute({ pathname: '/em', role: 'teacher' })).toEqual({ action: 'allow' })
  })
  it('giáo viên vào khu giáo viên được phép', () => {
    expect(resolveRoute({ pathname: '/tong-quan', role: 'teacher' })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/trinh-chieu', role: 'teacher' })).toEqual({ action: 'allow' })
  })
  it('đã đăng nhập vào /dang-nhap -> về trang của vai trò', () => {
    expect(resolveRoute({ pathname: '/dang-nhap', role: 'teacher' })).toEqual(redirect('/tong-quan'))
    expect(resolveRoute({ pathname: '/dang-nhap', role: 'student' })).toEqual(redirect('/em'))
  })
  it('chưa đăng nhập vào /dang-nhap được phép', () => {
    expect(resolveRoute({ pathname: '/dang-nhap', role: null })).toEqual({ action: 'allow' })
  })
  it('đường dẫn công khai luôn được phép', () => {
    expect(resolveRoute({ pathname: '/_next/static/x', role: null })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/brand/logo-truong.jpg', role: null })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/favicon.ico', role: null })).toEqual({ action: 'allow' })
  })
  it('không nhầm tiền tố: /tong-quan-x không phải khu giáo viên', () => {
    expect(resolveRoute({ pathname: '/tong-quan-x', role: 'teacher' })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/tong-quan-x', role: null })).toEqual(
      redirect('/dang-nhap?next=%2Ftong-quan-x'),
    )
  })
  it('gốc / đi về trang theo vai trò', () => {
    expect(resolveRoute({ pathname: '/', role: 'teacher' })).toEqual(redirect('/tong-quan'))
    expect(resolveRoute({ pathname: '/', role: 'student' })).toEqual(redirect('/em'))
    expect(resolveRoute({ pathname: '/', role: null })).toEqual(redirect('/dang-nhap?next=%2F'))
  })
  it('/dang-xuat công khai cho mọi vai trò', () => {
    expect(resolveRoute({ pathname: '/dang-xuat', role: 'student' })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/dang-xuat', role: null })).toEqual({ action: 'allow' })
  })
  it('/api/chat công khai để khung chat hiện cả ở trang đăng nhập; route tự kiểm phiên', () => {
    expect(resolveRoute({ pathname: '/api/chat', role: null })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/api/chat', role: 'student' })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/api/chat', role: 'teacher' })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/api/chat-x', role: null })).toEqual(redirect('/dang-nhap?next=%2Fapi%2Fchat-x'))
  })
  it('Kho học liệu của cô: học sinh về /em, khách về đăng nhập, cô được vào', () => {
    expect(resolveRoute({ pathname: '/kho-hoc-lieu', role: 'student' })).toEqual(redirect('/em'))
    expect(resolveRoute({ pathname: '/kho-hoc-lieu', role: null })).toEqual(
      redirect('/dang-nhap?next=%2Fkho-hoc-lieu'),
    )
    expect(resolveRoute({ pathname: '/kho-hoc-lieu', role: 'teacher' })).toEqual({ action: 'allow' })
  })
  it('học sinh mặc định bị chặn ngoài /em', () => {
    expect(resolveRoute({ pathname: '/foo', role: 'student' })).toEqual(redirect('/em'))
    expect(resolveRoute({ pathname: '/em/sao', role: 'student' })).toEqual({ action: 'allow' })
    expect(resolveRoute({ pathname: '/foo', role: 'teacher' })).toEqual({ action: 'allow' })
  })
})
