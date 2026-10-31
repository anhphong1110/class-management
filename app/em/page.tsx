import { requireStudent } from '@/lib/auth/session'

// Chỗ giữ tạm cho Task 8: chỉ kiểm tra học sinh hợp lệ (đã lưu trữ/không hồ sơ -> /dang-xuat).
export default async function StudentHomePlaceholder() {
  const user = await requireStudent()
  return <main className="p-6">Xin chào, {user.displayName}</main>
}
