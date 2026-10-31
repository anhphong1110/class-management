# Đợt 1: việc chuyển sang các đợt sau

Rút từ review cuối đợt 1 (nhánh `dot-1-nen-tang`). Plan của đợt tương ứng phải đưa các mục này vào.

## Đợt 2 (bắt buộc, làm trong migration đầu tiên)

- Trigger `before insert` trên `star_transactions`: với `kind='reversal'`, giao dịch gốc phải là `award` hoặc `penalty` và `delta = -gốc.delta`. Sau đó `competition_stars` chỉ tính reversal của award/penalty.
- Mọi hàm làm giảm số dư (`penalize_stars`, hoàn tác một lần cộng, `request_reward`, `approve_reward_request`) khóa dòng `students ... for update` trước khi đọc số dư, để sao khả dụng không âm khi có hai thao tác cùng lúc.
- Kiểm tra `star_criteria.kind` khớp loại giao dịch.
- `students unique (class_id, code)`.
- `alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated;`
- Đánh số migration tiếp theo bằng tay (`20261101000007_…`). Không dùng `supabase migration new`: timestamp hôm nay xếp trước schema.
- Từ đợt 1, hàm mới mặc định không có quyền EXECUTE cho PUBLIC/anon. Hàm trong `private.*` cần `grant execute ... to authenticated`; RPC cho anon và auth hook cần grant riêng.
- Test còn thiếu: tắt cờ lịch sử với `v_my_star_history`, tắt cờ xếp hạng, bảng xếp hạng loại lớp khác và học sinh lưu trữ, phép tính hoàn tác lần cộng.
- Modal: portal, khóa cuộn, nền `inert`, một lần Esc chỉ đóng modal trên cùng (cần cho hộp xác nhận trừ sao).
- Tách `resolveAvatars(ids)` dùng chung (hiện trùng ở `lib/layout/shell-data.ts` và `ho-so/page.tsx`).
- E2E tải ảnh: đổi `noisePng(800)` thành `noisePng(1000)` để test thật sự chứng minh có nén ảnh.
- Test `04_avatar` đếm mọi dòng `audit_logs`: giới hạn theo dòng do test tạo.

## Đợt 6 (trước khi chạy thật)

- Bước tạo lớp cho production (không dùng `seed.sql`): tạo `classes`, `class_settings`, 12 avatar preset; trigger `after insert on classes` tự tạo `class_settings`.
- Supabase hosted: bật Email provider, tắt "Allow new users to sign up", tăng giới hạn đăng nhập (40 học sinh qua cùng IP), kiểm tra Postgres ≥ 15.
- `AUTH_EMAIL_DOMAIN` giống hệt nhau ở nơi chạy `create-teacher:prod` và trên Vercel.
- Ghi chú advisor của Supabase sẽ cảnh báo 3 view `security_definer_view`: cố ý.
- Map lỗi 429 của GoTrue thành câu riêng, không báo "sai mật khẩu".
- Nút đăng xuất cho học sinh (máy dùng chung trong lớp).
- `app/error.tsx` dùng câu trung tính (giáo viên cũng thấy).
- Kiểm tra số lớp ràng buộc: `profiles` role ↔ `student_id`, regex username, khi làm tạo tài khoản hàng loạt.
- Thêm `.mcp.json` vào `.gitignore` nếu không muốn commit nó.

## Gói chỉnh giao diện (đợt nào cũng được, nên sớm)

Nút bo 14px; công tắc 46×27 và chữ "Đang bật/Đang tắt"; padding Card 22/24px; hàng logo trang Đăng nhập; bỏ chữ "Đang cất cánh…"; khối logo Sidebar trên máy tính bảng thấp lại; ARIA của tab Đăng nhập; Playwright mobile dùng UA điện thoại.
