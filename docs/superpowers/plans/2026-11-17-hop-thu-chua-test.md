# Hộp thư giáo viên: việc chưa kiểm thử

Ngày: 2026-11-17. Nhánh: `feat/teacher-inbox`.

## Đã kiểm tra
- `supabase db reset` + `pnpm db:test`: 24 file pass (`23_inbox` chạy 103 test).
- `pnpm test` (vitest): 560 test pass.
- `pnpm build`: pass.
- Kiểm tay bằng Playwright tạm (đã xóa) trên desktop: học sinh gửi thì badge giáo viên tăng không cần tải lại; giáo viên mở thì badge về 0 và học sinh thấy "Đã đọc"; giáo viên trả lời thì học sinh thấy ngay; gửi khi offline hiện "Gửi lại", gửi lại xong DB chỉ có 1 dòng.

## Chưa kiểm thử
- **`tests/e2e/inbox.spec.ts` (5 test) chưa chạy lần nào xong.** Lần chạy cuối bị dừng giữa chừng, nên chưa biết pass hay fail.
- **`tests/e2e/student-portal.spec.ts`** đã sửa số mục menu (7→8, 6→7) nhưng chưa chạy lại.
- **Toàn bộ e2e suite** chưa chạy sau khi thêm tính năng (menu mới, chip đếm trên Header/Sidebar có thể làm vỡ spec cũ như `shell`, `settings`, `student-pages`).
- `tests/e2e/helpers.ts` `admin()` có thể lỗi WebSocket trên Node 20; chưa xác nhận hướng sửa.
- **Giao diện mobile (375px)**: chỉ xem ảnh chụp trang học sinh. Chưa xem trang giáo viên (danh sách ↔ khung chat, nút quay lại) và chưa gửi tin thử trên mobile.
- **Giao diện giáo viên trên desktop**: chưa xem bằng mắt (hai cột, bộ lọc Tất cả / Chưa đọc / Chờ phản hồi, trạng thái rỗng, chọn học sinh để bắt đầu hội thoại).
- **Khung chat giáo viên cập nhật trực tiếp** khi đang mở đúng hội thoại: mới qua kênh chung, chưa có test riêng.
- **Hai giáo viên cùng lớp** cùng trả lời một hội thoại.
- **Tải thêm tin cũ** (phân trang `before`, trên 50 tin) và danh sách giáo viên với hơn 200 hội thoại (giới hạn hiện tại là 200).
- **Sao lưu/khôi phục thật qua giao diện** (tải file, khôi phục file có tin nhắn và file cũ không có). Mới có pgTAP và unit test.
- **Công tắc `student_can_message` ở Cài đặt**: chưa thử bằng giao diện (tắt thì menu biến mất, `/em/hop-thu` trả 404).
- **Chế độ xem thử** giao diện học sinh của giáo viên (`/em/hop-thu` chỉ hiện thông báo, không gửi được).
- **Realtime trên môi trường deploy** (Vercel + Supabase cloud): chưa bật publication và chưa kiểm tra. Cần chạy migration `20261101000023` trên DB thật trước.
- Đăng xuất rồi đăng nhập lại vẫn còn lịch sử; chống spam (tin thứ 6 trong 30 giây) qua giao diện.
- `pnpm lint` lỗi chỉ do thư mục `.claude/worktrees/` chưa theo dõi; chưa xử lý.

## Cần lưu ý khi gộp
- `components/chat/ChatWidget.tsx`: nhánh `fix/hide-chat-in-hub` (commit `e8a47c4`) cũng sửa dòng `HIDDEN_PATHS`. Khi gộp sẽ xung đột, giữ đủ cả bốn đường dẫn.
