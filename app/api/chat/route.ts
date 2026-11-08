import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth/session'
import { EMPTY_CATALOG, maskNames, matchIntent, needsCatalog, normalize } from '@/lib/chat/intents'
import { classifyWithLlm, type LlmResult } from '@/lib/chat/llm'
import { createBreaker, createTtlCache } from '@/lib/chat/cache'
import { createRateLimiter } from '@/lib/chat/rate-limit'
import { buildClassFacts } from '@/lib/chat/facts'
import {
  CHAT_ERROR,
  loadCatalog,
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
// Giữ hạn mức gói miễn phí: cùng một câu hỏi trong 5 phút dùng lại kết quả, và gặp 429 thì ngừng gọi AI 60 giây.
const llmCache = createTtlCache<LlmResult>({ ttlMs: 5 * 60_000 })
const llmBreaker = createBreaker({ cooldownMs: 60_000 })

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
    const catalog = needsCatalog(message) ? await loadCatalog(user, flags) : EMPTY_CATALOG
    let intent = matchIntent(message, roster, catalog)
    let reply: string | null = null

    const apiKey = process.env.GEMINI_API_KEY
    if (!intent && apiKey && !llmBreaker.isOpen()) {
      // Luật không hiểu: nhờ model miễn phí. Model nhận dữ liệu chung của lớp và câu hỏi đã che tên
      // (học sinh, cô giáo), không nhận tên người nào.
      const key = `${user.classId}|${user.role}|${normalize(message)}`
      let result = llmCache.get(key)
      if (!result) {
        const { masked, refs } = maskNames(message, await loadRosterForMasking(user))
        const facts = await buildClassFacts(user, flags)
        result =
          (await classifyWithLlm(masked, refs, facts, {
            apiKey,
            model: process.env.GEMINI_MODEL || undefined,
            onRateLimit: () => llmBreaker.trip(),
          })) ?? undefined
        if (result) llmCache.set(key, result)
      }
      if (result && 'answer' in result) reply = result.answer
      else if (result) intent = result.intent
    }

    if (reply === null) reply = intent ? await runIntent(intent, user, flags) : CHAT_UNKNOWN
    return NextResponse.json({ reply, suggestions }, { headers: noStore })
  } catch (e) {
    // Chỉ ghi lý do kỹ thuật, không ghi nội dung câu hỏi.
    console.error('chat POST failed:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ reply: CHAT_ERROR, suggestions: [] }, { headers: noStore })
  }
}
