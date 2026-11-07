import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth/session'
import { maskNames, matchIntent } from '@/lib/chat/intents'
import { classifyWithLlm } from '@/lib/chat/llm'
import { createRateLimiter } from '@/lib/chat/rate-limit'
import {
  CHAT_ERROR,
  loadClassTheme,
  loadFlags,
  loadPublicTheme,
  loadRosterForMasking,
  loadTeacherRoster,
  runIntent,
} from '@/lib/chat/handlers'
import { CHAT_UNKNOWN, suggestionsFor } from '@/lib/chat/suggestions'

const MAX_MESSAGE_LENGTH = 200
const limiter = createRateLimiter({ max: 20, windowMs: 60_000 })

const Body = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) })

const noStore = { 'cache-control': 'no-store' }

/** Thông tin để khung chat tự dựng: ai đang dùng, màu của lớp và các nút gợi ý. Không chứa dữ liệu học sinh. */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ role: null, theme: await loadPublicTheme(), suggestions: [] }, { headers: noStore })
    }
    const [theme, flags] = await Promise.all([loadClassTheme(user.classId), loadFlags(user)])
    return NextResponse.json({ role: user.role, theme, suggestions: suggestionsFor(user.role, flags) }, { headers: noStore })
  } catch (e) {
    console.error('chat GET failed:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ role: null, theme: null, suggestions: [] }, { headers: noStore })
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: noStore })

  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_message' }, { status: 400, headers: noStore })
  const { message } = parsed.data

  if (!limiter.take(user.userId)) {
    return NextResponse.json({ reply: 'Bạn hỏi nhanh quá, đợi mình một chút rồi hỏi tiếp nhé.', suggestions: [] }, { status: 429, headers: noStore })
  }

  try {
    const flags = await loadFlags(user)
    const suggestions = suggestionsFor(user.role, flags)

    // Giáo viên được hỏi tên từng bạn; học sinh không, nên không cần danh sách để hiểu câu.
    const roster = user.role === 'teacher' ? await loadTeacherRoster(user) : []
    let intent = matchIntent(message, roster)

    if (!intent && process.env.GEMINI_API_KEY) {
      // Câu tự do: nhờ model miễn phí chỉ để hiểu ý. Tên học sinh luôn được che trước khi gửi đi.
      const { masked, refs } = maskNames(message, await loadRosterForMasking(user))
      intent = await classifyWithLlm(masked, refs, { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || undefined })
    }

    if (!intent) return NextResponse.json({ reply: CHAT_UNKNOWN, suggestions }, { headers: noStore })
    return NextResponse.json({ reply: await runIntent(intent, user, flags), suggestions }, { headers: noStore })
  } catch (e) {
    // Chỉ ghi lý do kỹ thuật, không ghi nội dung câu hỏi.
    console.error('chat POST failed:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ reply: CHAT_ERROR, suggestions: [] }, { headers: noStore })
  }
}
