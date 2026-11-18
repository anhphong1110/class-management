# Ghi chú cho Claude khi làm việc trong project này

## Chạy e2e test
- Chỉ chạy e2e của **tính năng vừa làm** và **các tính năng bị ảnh hưởng** (ví dụ: `pnpm test:e2e tests/e2e/inbox.spec.ts tests/e2e/shell.spec.ts`).
- **Không chạy toàn bộ e2e** (`pnpm test:e2e` không kèm file), trừ khi người dùng yêu cầu rõ.
- Nếu không chắc spec nào bị ảnh hưởng, tìm bằng grep (route, menu, setting liên quan) rồi chọn các spec đó; ghi rõ trong báo cáo những spec nào đã chạy và spec nào không.
- Unit test (`pnpm test`), `pnpm lint` và pgTAP (`pnpm db:test`, khi đổi DB) vẫn chạy đầy đủ như bình thường.

## Commit, push và mở PR
- Khi người dùng yêu cầu commit, push hoặc mở PR: chỉ commit và push nhánh, **không tự tạo PR** (không dùng `gh pr create`).
- Sau khi push, đưa cho người dùng link so sánh `https://github.com/anhphong1110/class-management/pull/new/<nhánh>` kèm **title** và **description** gợi ý (viết sẵn để copy). Người dùng sẽ tự mở PR.
- Push qua SSH alias `github-anhphong1110`.
