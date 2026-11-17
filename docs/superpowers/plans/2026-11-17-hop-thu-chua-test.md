# Hộp thư giáo viên: việc chưa kiểm thử

Ngày: 2026-11-17. Nhánh: `feat/teacher-inbox`, cập nhật trên `test/inbox-verification`.

## Đã kiểm tra
- `supabase db reset` + `pnpm db:test`: 24 file pass (`23_inbox` chạy 103 test).
- `pnpm test` (vitest): 560 test pass.
- `pnpm build`: pass.
- Kiểm tay bằng Playwright tạm (đã xóa) trên desktop: học sinh gửi thì badge giáo viên tăng không cần tải lại; giáo viên mở thì badge về 0 và học sinh thấy "Đã đọc"; giáo viên trả lời thì học sinh thấy ngay; gửi khi offline hiện "Gửi lại", gửi lại xong DB chỉ có 1 dòng.

- e2e (Playwright, 3 viewport mobile/tablet/desktop): `tests/e2e/inbox.spec.ts` (5 test) và `tests/e2e/inbox-extra.spec.ts` (8 test) pass. Gồm: công tắc `student_can_message` (menu biến mất, `/em/hop-thu` 404, bật lại), chế độ xem thử của cô (chỉ có thông báo, không có ô nhập), hai cô cùng lớp cùng trả lời một hội thoại, khung chat cô cập nhật trực tiếp khi học sinh gửi, đăng xuất rồi đăng nhập lại còn lịch sử (cả hai phía), chống spam (tin thứ 6 trong 30 giây), phân trang (60 tin: hiện 50, "Xem tin cũ hơn" tải nốt, cả hai phía), danh sách của cô (trạng thái rỗng và ba bộ lọc), bản sao lưu tải về có chứa hội thoại và tin nhắn.
- `tests/e2e/shell.spec.ts` đã sửa số mục menu cô (có "Hộp thư giáo viên", 15 liên kết) và `helpers.ts` `openTeacherMenu` không bấm ☰ khi ngăn kéo đã mở. Đã chạy cả 3 viewport, pass: inbox, inbox-extra, shell, settings, student-portal, student-pages, backup.
- `admin()` trong `tests/e2e/helpers.ts` chạy tốt trên Node 20, không cần sửa.
- `pnpm lint` (đã thêm `.claude/**` vào ignores): 0 lỗi, 3 cảnh báo cũ. `pnpm test`: 560 pass. `pnpm build`: pass.

## Chưa kiểm thử
- **Khôi phục thật qua giao diện** file sao lưu có tin nhắn (và file cũ không có tin nhắn). Khôi phục tạo lớp mới và lưu trữ lớp seed, làm vỡ mọi spec dùng lớp seed; mới có pgTAP và unit test, cùng e2e xác nhận file sao lưu chứa tin nhắn.
- **Giao diện mobile (375px) trang giáo viên** (danh sách ↔ khung chat, nút quay lại): e2e chỉ gửi tin được trên 375px, chưa xem bằng mắt.
- **Giao diện giáo viên trên desktop** chưa xem bằng mắt (bố cục hai cột); logic lọc, trạng thái rỗng, chọn hội thoại đã có e2e.
- **Danh sách giáo viên với hơn 200 hội thoại** (giới hạn hiện tại là 200).
- **Realtime trên môi trường deploy** (Vercel + Supabase cloud): chưa bật publication và chưa kiểm tra. Cần chạy migration `20261101000023` trên DB thật trước.
- **Các spec còn lại của e2e (random, rewards, login, new-year, stars, students, missions, hub...) chưa chạy lại sau hộp thư.** Lần chạy cả bộ bị dừng giữa chừng; các lỗi thấy được (random, login, rewards, stars, students, student-pages) là timeout hoặc mục menu ở ngăn kéo, không liên quan hộp thư, và chưa xác nhận trên `main`.

## Cần lưu ý khi gộp
- `components/chat/ChatWidget.tsx`: nhánh `fix/hide-chat-in-hub` (commit `e8a47c4`) cũng sửa dòng `HIDDEN_PATHS`. Khi gộp sẽ xung đột, giữ đủ cả bốn đường dẫn.
