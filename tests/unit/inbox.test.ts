import { describe, expect, it } from 'vitest'
import {
  conversationStatus,
  filterConversations,
  messageInput,
  messageStatusLabel,
  previewText,
  type ConversationSummary,
} from '@/lib/inbox/types'
import { mergeMessages, setPending } from '@/lib/inbox/merge'
import { formatListTime, formatMessageTime } from '@/lib/inbox/time'
import type { LocalMessage } from '@/lib/inbox/types'

const ID = '11111111-1111-1111-1111-111111111111'
const ID2 = '22222222-2222-2222-2222-222222222222'

describe('messageInput', () => {
  it('cắt khoảng trắng hai đầu', () => {
    expect(messageInput.parse({ body: '  chào cô  ', clientId: ID }).body).toBe('chào cô')
  })
  it('từ chối tin rỗng hoặc chỉ có khoảng trắng', () => {
    expect(messageInput.safeParse({ body: '', clientId: ID }).success).toBe(false)
    expect(messageInput.safeParse({ body: ' \n\t ', clientId: ID }).success).toBe(false)
  })
  it('2000 ký tự được, 2001 thì không', () => {
    expect(messageInput.safeParse({ body: 'a'.repeat(2000), clientId: ID }).success).toBe(true)
    expect(messageInput.safeParse({ body: 'a'.repeat(2001), clientId: ID }).success).toBe(false)
  })
  it('clientId phải là uuid, studentId tùy chọn nhưng phải là uuid', () => {
    expect(messageInput.safeParse({ body: 'x', clientId: 'abc' }).success).toBe(false)
    expect(messageInput.safeParse({ body: 'x', clientId: ID, studentId: 'abc' }).success).toBe(false)
    expect(messageInput.safeParse({ body: 'x', clientId: ID, studentId: ID2 }).success).toBe(true)
  })
  it('chấp nhận uuid của seed không đúng phiên bản RFC', () => {
    expect(messageInput.safeParse({ body: 'x', clientId: '00000000-0000-0000-0000-000000000001' }).success).toBe(true)
  })
})

describe('conversationStatus / messageStatusLabel', () => {
  it('tin cuối của học sinh: chờ giáo viên phản hồi', () => {
    expect(conversationStatus('student')).toBe('waiting')
  })
  it('tin cuối của giáo viên hoặc chưa có tin: đã phản hồi', () => {
    expect(conversationStatus('teacher')).toBe('answered')
    expect(conversationStatus(null)).toBe('answered')
  })
  it('đã đọc khi có read_at', () => {
    expect(messageStatusLabel('2026-11-17T01:00:00Z')).toBe('Đã đọc')
    expect(messageStatusLabel(null)).toBe('Đã gửi')
  })
})

describe('previewText', () => {
  it('gộp xuống dòng và khoảng trắng thành một dòng', () => {
    expect(previewText('Chào cô\n\n  em hỏi   bài')).toBe('Chào cô em hỏi bài')
  })
  it('cắt dài hơn giới hạn và thêm …', () => {
    const out = previewText('a'.repeat(100), 10)
    expect(out).toBe('aaaaaaaaaa…')
  })
  it('đúng bằng giới hạn thì giữ nguyên', () => {
    expect(previewText('abcde', 5)).toBe('abcde')
  })
  it('không cắt giữa ký tự có dấu tổ hợp bằng cặp surrogate', () => {
    expect(previewText('😀😀😀', 2)).toBe('😀😀…')
  })
})

describe('filterConversations', () => {
  const mk = (id: string, unread: number, last: 'student' | 'teacher'): ConversationSummary => ({
    id, studentId: id, studentName: id, avatar: null, lastMessageAt: '2026-11-17T01:00:00Z', lastSenderRole: last, lastBody: '', unreadCount: unread,
  })
  const list = [mk('a', 2, 'student'), mk('b', 0, 'student'), mk('c', 0, 'teacher')]
  it('all giữ nguyên', () => expect(filterConversations(list, 'all')).toHaveLength(3))
  it('unread chỉ lấy hội thoại còn tin chưa đọc', () => expect(filterConversations(list, 'unread').map((c) => c.id)).toEqual(['a']))
  it('waiting lấy hội thoại tin cuối là của học sinh', () => expect(filterConversations(list, 'waiting').map((c) => c.id)).toEqual(['a', 'b']))
})

const msg = (over: Partial<LocalMessage>): LocalMessage => ({
  id: 'm1', conversationId: 'c1', senderRole: 'student', body: 'xin chào', clientId: ID, createdAt: '2026-11-17T01:00:00.000Z', readAt: null, ...over,
})

describe('mergeMessages', () => {
  it('thêm tin mới và xếp theo giờ gửi', () => {
    const out = mergeMessages([msg({ id: 'b', clientId: ID2, createdAt: '2026-11-17T02:00:00Z' })], [msg({ id: 'a' })])
    expect(out.map((m) => m.id)).toEqual(['a', 'b'])
  })
  it('tin từ máy chủ thay thế tin lạc quan cùng clientId, không lặp', () => {
    const optimistic = msg({ id: 'local-x', pending: 'sending', createdAt: '2026-11-17T01:00:05.000Z' })
    const out = mergeMessages([optimistic], [msg({ id: 'server-1' })])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('server-1')
    expect(out[0].pending).toBeUndefined()
  })
  it('cùng id đến hai lần (Realtime rồi phản hồi gửi) chỉ còn một', () => {
    const once = mergeMessages([], [msg({ id: 's' })])
    expect(mergeMessages(once, [msg({ id: 's' })])).toHaveLength(1)
  })
  it('cập nhật read_at của tin đã có', () => {
    const out = mergeMessages([msg({ id: 's' })], [msg({ id: 's', readAt: '2026-11-17T01:05:00Z' })])
    expect(out[0].readAt).toBe('2026-11-17T01:05:00Z')
  })
  it('tin chưa xác nhận không đè lên tin đã xác nhận', () => {
    const out = mergeMessages([msg({ id: 's' })], [msg({ id: 'local-x', pending: 'sending' })])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('s')
  })
  it('tin đang chờ luôn nằm cuối dù đồng hồ máy lệch', () => {
    const pending = msg({ id: 'local-p', clientId: ID2, pending: 'sending', createdAt: '2026-11-17T00:00:00Z' })
    const out = mergeMessages([pending], [msg({ id: 'later', createdAt: '2026-11-17T03:00:00Z' })])
    expect(out.map((m) => m.id)).toEqual(['later', 'local-p'])
  })
  it('không sửa mảng đầu vào', () => {
    const cur = [msg({ id: 'a' })]
    mergeMessages(cur, [msg({ id: 'b', clientId: ID2 })])
    expect(cur).toHaveLength(1)
  })
  it('gửi lại cùng clientId sau lỗi vẫn là một tin', () => {
    const failed = setPending([msg({ id: 'local-x', pending: 'sending' })], ID, 'failed')
    expect(failed[0].pending).toBe('failed')
    const retried = mergeMessages(failed, [msg({ id: 'local-x', pending: 'sending' })])
    expect(retried).toHaveLength(1)
    expect(retried[0].pending).toBe('sending')
  })
})

describe('setPending', () => {
  it('chỉ đổi tin lạc quan có clientId khớp', () => {
    const list = [msg({ id: 'a', pending: 'sending' }), msg({ id: 'b', clientId: ID2 })]
    const out = setPending(list, ID2, 'failed')
    expect(out[1].pending).toBeUndefined()
    expect(out[0].pending).toBe('sending')
  })
})

describe('formatMessageTime', () => {
  const now = new Date('2026-11-17T05:00:00Z') // 12:00 giờ Việt Nam
  it('hôm nay chỉ hiện giờ theo Asia/Ho_Chi_Minh (UTC+7)', () => {
    expect(formatMessageTime('2026-11-17T02:05:00Z', now)).toBe('09:05')
  })
  it('ngày khác hiện kèm ngày/tháng', () => {
    expect(formatMessageTime('2026-11-15T02:05:00Z', now)).toBe('15/11 09:05')
  })
  it('22:00 UTC đã sang ngày hôm sau ở Việt Nam', () => {
    expect(formatMessageTime('2026-11-16T22:30:00Z', now)).toBe('05:30')
  })
  it('chuỗi giờ hỏng thì trả rỗng', () => {
    expect(formatMessageTime('không phải giờ', now)).toBe('')
  })
  it('danh sách: hôm nay giờ, hôm khác ngày/tháng', () => {
    expect(formatListTime('2026-11-17T02:05:00Z', now)).toBe('09:05')
    expect(formatListTime('2026-11-15T02:05:00Z', now)).toBe('15/11')
  })
})
