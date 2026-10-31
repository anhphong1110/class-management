# Đợt 2: việc chuyển tiếp sang Đợt 3 trở đi

Ghi chú từ đợt rà soát cuối của Đợt 2 (nhánh `dot-2-hoc-sinh-va-sao`).

## Quy tắc khóa (bắt buộc cho mọi hàm mới)

Thứ tự khóa toàn cục, cũng được ghi ở đầu `20261101000008_star_functions.sql`:

- `students` (theo id tăng dần, `FOR NO KEY UPDATE`) -> `rewards` -> `reward_requests`.
- `groups` (theo id tăng dần) -> `group_members`.
- Không bao giờ khóa `students` sau khi đã khóa `groups`.
- Dùng `FOR NO KEY UPDATE`, không dùng `FOR UPDATE`, trên `students`: các INSERT có khóa ngoại (điểm danh, sổ sao...) lấy `FOR KEY SHARE` trên hàng học sinh và sẽ deadlock với `FOR UPDATE`. Kịch bản kiểm tra: `.superpowers/sdd/2026-10-31-dot-2-hoc-sinh-va-sao/deadlock-fk-insert.sh`.

## Việc cần làm ở các đợt sau

1. `request_reward` và `approve` phải khóa học sinh `FOR NO KEY UPDATE` trước tiên, rồi mới khóa `rewards`, `reward_requests`.
2. RPC `archive_student` phải giải phóng số sao đang giữ chỗ (ghi dòng `release` cho mọi yêu cầu đổi quà đang chờ của bạn đó).
3. `deleteTestStudents` (helper e2e `tests/e2e/helpers/ledger.ts`) phải xóa `reward_requests` và các dòng sổ gắn với quà (`reserve`, `release`, `redeem`) trước khi xóa học sinh.
4. Test đường UI hoàn tác báo `insufficient_stars` khi sao đã bị giữ chỗ cho một yêu cầu đổi quà.
5. Trigger `check_star_transaction` có thể kiểm thêm `reward_request.student_id = row.student_id` cho các dòng `reserve`, `release`, `redeem`.
