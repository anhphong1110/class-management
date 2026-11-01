'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { createServerSupabase } from '@/lib/supabase/server'
import { toVietnameseMessage } from '@/lib/errors'
import { IMAGE_EXT, MAX_UPLOAD_BYTES, validateImageFile } from '@/lib/domain/upload'
import { REWARD_PRESET_KEYS } from '@/lib/rewards/presets'

type Result = { error?: string; message?: string }
type Supabase = Awaited<ReturnType<typeof createServerSupabase>>

// guid: `z.uuid()` của Zod 4 đòi đúng phiên bản RFC, còn id seed thì không có.
const uuid = z.guid()
const rewardInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(80),
  cost: z.number().int().min(1).max(1000),
  description: z.string().max(200),
  /** Bắt buộc khi tạo mới (chèn cùng một lệnh); khi sửa dùng `setRewardStock`. */
  stock: z.number().int().min(0).max(100000).optional(),
  icon: z.enum(REWARD_PRESET_KEYS as [string, ...string[]]).nullable(),
  /** Chọn hình có sẵn thì bỏ ảnh đã tải lên. */
  clearImage: z.boolean().optional(),
})
const hiddenInput = z.object({ id: uuid, hidden: z.boolean() })
const stockInput = z.object({ id: uuid, stock: z.number().int().min(0).max(100000) })

function refresh() {
  revalidatePath('/doi-qua')
}

function invalid(): Result {
  return { error: toVietnameseMessage('invalid_input') }
}

async function removeImage(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from('class-media').remove([path])
}

export async function saveReward(
  raw: unknown,
): Promise<Result & { id?: string }> {
  const user = await requireTeacher()
  const parsed = rewardInput.safeParse(raw)
  if (!parsed.success) return invalid()
  const { id, name, cost, description, icon, clearImage, stock } = parsed.data
  const supabase = await createServerSupabase()
  if (!id) {
    if (stock === undefined) return invalid()
    const { data, error } = await supabase
      .from('rewards')
      .insert({ class_id: user.classId, name, cost, description, icon, stock })
      .select('id')
      .single()
    if (error || !data) return { error: toVietnameseMessage(error?.message ?? 'not_allowed') }
    refresh()
    return { id: data.id }
  }
  const { data: before, error: readError } = await supabase.from('rewards').select('image_path').eq('id', id).maybeSingle()
  if (readError) throw new Error(readError.message)
  const patch: { name: string; cost: number; description: string; icon: string | null; image_path?: null } = {
    name, cost, description, icon,
  }
  if (clearImage) patch.image_path = null
  const { data, error } = await supabase.from('rewards').update(patch).eq('id', id).select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return { error: toVietnameseMessage('reward_not_found') }
  if (clearImage) await removeImage(supabase, before?.image_path)
  refresh()
  return { id }
}

export async function setRewardHidden(id: string, hidden: boolean): Promise<Result> {
  await requireTeacher()
  if (!hiddenInput.safeParse({ id, hidden }).success) return invalid()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('rewards').update({ hidden }).eq('id', id).select('id')
  if (error) return { error: toVietnameseMessage(error.message) }
  if (!data?.length) return { error: toVietnameseMessage('reward_not_found') }
  refresh()
  return {}
}

export async function setRewardStock(id: string, stock: number): Promise<Result> {
  await requireTeacher()
  if (!stockInput.safeParse({ id, stock }).success) return invalid()
  const supabase = await createServerSupabase()
  const { error } = await supabase.rpc('set_reward_stock', { p_reward_id: id, p_stock: stock })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  return {}
}

export async function uploadRewardImage(form: FormData): Promise<Result> {
  const user = await requireTeacher()
  const id = uuid.safeParse(form.get('id'))
  if (!id.success) return invalid()
  const file = form.get('file')
  if (!(file instanceof File)) return { error: toVietnameseMessage('unsupported_type') }
  if (file.size > MAX_UPLOAD_BYTES) return { error: toVietnameseMessage('file_too_large') }
  const check = validateImageFile(file)
  if (!check.ok) return { error: toVietnameseMessage(check.error) }

  const supabase = await createServerSupabase()
  const { data: reward, error: readError } = await supabase.from('rewards').select('image_path').eq('id', id.data).maybeSingle()
  if (readError) throw new Error(readError.message)
  if (!reward) return { error: toVietnameseMessage('reward_not_found') }

  const path = `${user.classId}/rewards/${randomUUID()}.${IMAGE_EXT[file.type]}`
  const up = await supabase.storage.from('class-media').upload(path, file, { contentType: file.type })
  if (up.error) return { error: toVietnameseMessage('upload_failed') }

  const { data, error } = await supabase.from('rewards').update({ image_path: path }).eq('id', id.data).select('id')
  if (error || !data?.length) {
    await removeImage(supabase, path)
    return { error: toVietnameseMessage('upload_failed') }
  }
  await removeImage(supabase, reward.image_path)
  refresh()
  return {}
}

/** Tên học sinh và giá của yêu cầu, để ghép câu thông báo. */
async function requestInfo(supabase: Supabase, id: string): Promise<{ name: string; cost: number } | null> {
  const { data, error } = await supabase
    .from('reward_requests')
    .select('cost, students(full_name)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const student = data.students as unknown as { full_name: string } | null
  return { name: student?.full_name ?? '', cost: data.cost }
}

async function decide(
  rpcName: 'approve_reward_request' | 'reject_reward_request' | 'deliver_reward_request',
  id: string,
  say: (info: { name: string; cost: number }) => string,
): Promise<Result> {
  await requireTeacher()
  if (!uuid.safeParse(id).success) return invalid()
  const supabase = await createServerSupabase()
  const info = await requestInfo(supabase, id)
  if (!info) return { error: toVietnameseMessage('already_processed') }
  const { error } = await supabase.rpc(rpcName, { p_request_id: id })
  if (error) return { error: toVietnameseMessage(error.message) }
  refresh()
  revalidatePath('/thi-dua')
  return { message: say(info) }
}

export async function approveRequest(id: string): Promise<Result> {
  return decide(
    'approve_reward_request',
    id,
    ({ name, cost }) => `Đã duyệt: trừ ${cost} sao của ${name} và cập nhật tồn kho. Yêu cầu này không thể xử lý lần hai.`,
  )
}

export async function rejectRequest(id: string): Promise<Result> {
  return decide('reject_reward_request', id, ({ name }) => `Đã từ chối. Số sao và quà đã giữ được trả lại cho ${name}.`)
}

export async function deliverRequest(id: string): Promise<Result> {
  return decide('deliver_reward_request', id, ({ name }) => `Đã ghi nhận trao quà cho ${name}.`)
}
