import { z } from 'zod'

/** Tên môn: chuẩn hóa NFC (dấu tiếng Việt gõ rời và gõ liền thành một dạng), bỏ khoảng trắng đầu cuối, 1–40 ký tự. */
export const subjectNameSchema = z
  .string()
  .transform((s) => s.normalize('NFC').trim())
  .pipe(z.string().min(1).max(40))
