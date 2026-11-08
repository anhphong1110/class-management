import { describe, expect, it, vi } from 'vitest'
import { classifyWithLlm, toIntent } from '@/lib/chat/llm'

const refs = { HS1: ['b'] }
const FACTS = 'Hôm nay: Thứ Hai, 09/11/2026.\nSĩ số: 35 học sinh.'

describe('toIntent', () => {
  it('đổi kết quả của model sang intent của hệ thống', () => {
    expect(toIntent({ intent: 'timetable', day: 'tue' }, refs)).toEqual({ intent: 'timetable', day: 2 })
    expect(toIntent({ intent: 'timetable', day: 'sun' }, refs)).toEqual({ intent: 'timetable', day: 0 })
    expect(toIntent({ intent: 'timetable' }, refs)).toEqual({ intent: 'timetable', day: 'today' })
    expect(toIntent({ intent: 'top_stars', period: 'month', limit: 5 }, refs)).toEqual({ intent: 'top_stars', period: 'month', limit: 5 })
    expect(toIntent({ intent: 'top_stars' }, refs)).toEqual({ intent: 'top_stars', period: 'year', limit: 3 })
    expect(toIntent({ intent: 'my_stars' }, refs)).toEqual({ intent: 'my_stars' })
    expect(toIntent({ intent: 'class_size' }, refs)).toEqual({ intent: 'class_size' })
    expect(toIntent({ intent: 'teacher_name' }, refs)).toEqual({ intent: 'teacher_name' })
  })
  it('nhóm mới: tổng sao, quà, số tiết', () => {
    expect(toIntent({ intent: 'class_stars', period: 'month' }, refs)).toEqual({ intent: 'class_stars', period: 'month' })
    expect(toIntent({ intent: 'class_stars', period: 'year' }, refs)).toEqual({ intent: 'class_stars', period: 'week' })
    expect(toIntent({ intent: 'rewards', reward: 'Sổ tay' }, refs)).toEqual({ intent: 'rewards', name: 'Sổ tay' })
    expect(toIntent({ intent: 'subject_periods', subject: 'Toán' }, refs)).toEqual({ intent: 'subject_periods', subject: 'Toán' })
  })
  it('đổi ký hiệu học sinh về mã học sinh, ký hiệu lạ thì rỗng', () => {
    expect(toIntent({ intent: 'student_stars', student: 'HS1' }, refs)).toEqual({ intent: 'student_stars', studentIds: ['b'] })
    expect(toIntent({ intent: 'student_stars', student: 'HS9' }, refs)).toEqual({ intent: 'student_stars', studentIds: [] })
    expect(toIntent({ intent: 'student_stars' }, refs)).toEqual({ intent: 'student_stars', studentIds: [] })
  })
  it('unknown và facts không phải intent của code', () => {
    expect(toIntent({ intent: 'unknown' }, refs)).toBeNull()
    expect(toIntent({ intent: 'facts', answer: 'x' }, refs)).toBeNull()
  })
})

const okResponse = (obj: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 })

describe('classifyWithLlm', () => {
  it('không có khóa API thì không gọi mạng', async () => {
    const fetchImpl = vi.fn()
    expect(await classifyWithLlm('hôm nay học gì', refs, FACTS, { fetchImpl })).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('gọi Gemini: khóa ở header, dữ liệu lớp ở chỉ dẫn hệ thống, chỉ câu hỏi đã che tên ở nội dung người dùng', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ intent: 'timetable', day: 'mon' }))
    const out = await classifyWithLlm('{HS1} mai học gì', refs, FACTS, { apiKey: 'KEY', model: 'm1', fetchImpl })
    expect(out).toEqual({ intent: { intent: 'timetable', day: 1 } })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toContain('/models/m1:generateContent')
    expect(String(url)).not.toContain('KEY')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY')
    const body = JSON.parse(init.body as string)
    expect(body.contents[0].parts[0].text).toBe('{HS1} mai học gì')
    expect(body.systemInstruction.parts[0].text).toContain('Sĩ số: 35 học sinh.')
    expect(body.contents[0].parts[0].text).not.toContain('Sĩ số')
  })

  it('model tự trả lời từ dữ liệu lớp', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ intent: 'facts', answer: 'Lớp mình có 35 học sinh.' }))
    expect(await classifyWithLlm('lớp đông không', refs, FACTS, { apiKey: 'KEY', fetchImpl })).toEqual({ answer: 'Lớp mình có 35 học sinh.' })
  })

  it('bỏ câu trả lời rỗng, quá dài hoặc còn ký hiệu {…}', async () => {
    for (const answer of ['', '  ', 'x'.repeat(501), 'Bạn {HS1} có 3 sao']) {
      const fetchImpl = vi.fn().mockResolvedValue(okResponse({ intent: 'facts', answer }))
      expect(await classifyWithLlm('abc', refs, FACTS, { apiKey: 'KEY', fetchImpl })).toBeNull()
    }
    const noAnswer = vi.fn().mockResolvedValue(okResponse({ intent: 'facts' }))
    expect(await classifyWithLlm('abc', refs, FACTS, { apiKey: 'KEY', fetchImpl: noAnswer })).toBeNull()
  })

  it('unknown thì null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ intent: 'unknown' }))
    expect(await classifyWithLlm('hôm qua mưa không', refs, FACTS, { apiKey: 'KEY', fetchImpl })).toBeNull()
  })

  it('lỗi 429 báo cho cầu dao và trả null', async () => {
    const onRateLimit = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue(new Response('quota', { status: 429 }))
    expect(await classifyWithLlm('abc', refs, FACTS, { apiKey: 'KEY', fetchImpl, onRateLimit })).toBeNull()
    expect(onRateLimit).toHaveBeenCalledOnce()
  })

  it('JSON hỏng, dữ liệu sai schema hoặc ngoại lệ đều trả null và không báo cầu dao', async () => {
    const onRateLimit = vi.fn()
    const bad = [
      new Response('server error', { status: 500 }),
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'không phải json' }] } }] }), { status: 200 }),
      okResponse({ intent: 'xoa_het_du_lieu' }),
    ]
    for (const res of bad) {
      const fetchImpl = vi.fn().mockResolvedValue(res)
      expect(await classifyWithLlm('abc', refs, FACTS, { apiKey: 'KEY', fetchImpl, onRateLimit })).toBeNull()
    }
    const boom = vi.fn().mockRejectedValue(new Error('mạng hỏng'))
    expect(await classifyWithLlm('abc', refs, FACTS, { apiKey: 'KEY', fetchImpl: boom, onRateLimit })).toBeNull()
    expect(onRateLimit).not.toHaveBeenCalled()
  })

  it('quá thời gian chờ thì trả null', async () => {
    const slow = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
    }))
    expect(await classifyWithLlm('abc', refs, FACTS, { apiKey: 'KEY', fetchImpl: slow, timeoutMs: 20 })).toBeNull()
  })
})
