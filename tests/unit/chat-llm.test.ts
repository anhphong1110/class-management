import { describe, expect, it, vi } from 'vitest'
import { classifyWithLlm, toIntent } from '@/lib/chat/llm'

const refs = { HS1: ['b'] }

describe('toIntent', () => {
  it('đổi kết quả của model sang intent của hệ thống', () => {
    expect(toIntent({ intent: 'timetable', day: 'tue' }, refs)).toEqual({ intent: 'timetable', day: 2 })
    expect(toIntent({ intent: 'timetable', day: 'sun' }, refs)).toEqual({ intent: 'timetable', day: 0 })
    expect(toIntent({ intent: 'timetable' }, refs)).toEqual({ intent: 'timetable', day: 'today' })
    expect(toIntent({ intent: 'top_stars', period: 'month', limit: 5 }, refs)).toEqual({ intent: 'top_stars', period: 'month', limit: 5 })
    expect(toIntent({ intent: 'top_stars' }, refs)).toEqual({ intent: 'top_stars', period: 'year', limit: 3 })
    expect(toIntent({ intent: 'my_stars' }, refs)).toEqual({ intent: 'my_stars' })
  })
  it('đổi ký hiệu học sinh về mã học sinh, ký hiệu lạ thì rỗng', () => {
    expect(toIntent({ intent: 'student_stars', student: 'HS1' }, refs)).toEqual({ intent: 'student_stars', studentIds: ['b'] })
    expect(toIntent({ intent: 'student_stars', student: 'HS9' }, refs)).toEqual({ intent: 'student_stars', studentIds: [] })
    expect(toIntent({ intent: 'student_stars' }, refs)).toEqual({ intent: 'student_stars', studentIds: [] })
  })
  it('unknown thì null', () => {
    expect(toIntent({ intent: 'unknown' }, refs)).toBeNull()
  })
})

const okResponse = (obj: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 })

describe('classifyWithLlm', () => {
  it('không có khóa API thì không gọi mạng', async () => {
    const fetchImpl = vi.fn()
    expect(await classifyWithLlm('hôm nay học gì', refs, { fetchImpl })).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('gọi Gemini, khóa nằm ở header chứ không ở URL, và chỉ gửi câu hỏi đã che tên', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ intent: 'timetable', day: 'mon' }))
    const out = await classifyWithLlm('{HS1} mai học gì', refs, { apiKey: 'KEY', model: 'm1', fetchImpl })
    expect(out).toEqual({ intent: 'timetable', day: 1 })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toContain('/models/m1:generateContent')
    expect(String(url)).not.toContain('KEY')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('KEY')
    expect(JSON.parse(init.body as string).contents[0].parts[0].text).toBe('{HS1} mai học gì')
  })

  it('lỗi 429, JSON hỏng, dữ liệu sai schema hoặc ngoại lệ đều trả null', async () => {
    const bad = [
      new Response('quota', { status: 429 }),
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'không phải json' }] } }] }), { status: 200 }),
      okResponse({ intent: 'xoa_het_du_lieu' }),
    ]
    for (const res of bad) {
      const fetchImpl = vi.fn().mockResolvedValue(res)
      expect(await classifyWithLlm('abc', refs, { apiKey: 'KEY', fetchImpl })).toBeNull()
    }
    const boom = vi.fn().mockRejectedValue(new Error('mạng hỏng'))
    expect(await classifyWithLlm('abc', refs, { apiKey: 'KEY', fetchImpl: boom })).toBeNull()
  })

  it('quá thời gian chờ thì trả null', async () => {
    const slow = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
    }))
    expect(await classifyWithLlm('abc', refs, { apiKey: 'KEY', fetchImpl: slow, timeoutMs: 20 })).toBeNull()
  })
})
