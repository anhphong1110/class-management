# Kho học liệu: mục menu nhúng web Study with Bông

Quy mô: thay đổi nhỏ (một mục menu + hai trang nhúng). Bản thiết kế ngắn.

## Ý định và lý do

Cô giáo có một web riêng, https://studywithbong.netlify.app/ (Study with Bông – BONGVERSE), chứa trò chơi, sách lật và video cho Mầm non – Lớp 5. Cô muốn cả cô giáo và học sinh vào được từ thanh menu của web lớp, dưới tên **"Kho học liệu"**.

Web kia là một trang tổng hợp: bấm vào một nội dung (trò chơi, sách lật) thì mở trang chi tiết, và nút "Mở Trò chơi" / "Mở Sách lật" ở đó mở **một tab mới** (`target="_blank"`) sang web của từng game (`*.netlify.app`) hoặc `heyzine.com`. Vì vậy nếu chỉ đặt link thì người dùng phải qua thêm một tab trung gian (web lớp → trang tổng hợp → game). Cô quyết định **nhúng trang tổng hợp vào trong web lớp**, để game và sách lật là tab mới duy nhất.

## Mục tiêu

- Menu cô giáo và menu học sinh đều có mục "Kho học liệu".
- Bấm vào thì trang tổng hợp hiện trong khung nội dung, giữ nguyên menu và thanh trên của web lớp.
- Bấm "Mở Trò chơi / Mở Sách lật" thì game hoặc sách mở ở tab mới, như hiện nay.
- Địa chỉ web nằm ở một chỗ cấu hình duy nhất.

## Không làm (non-goals)

- Không có công tắc bật/tắt hay khóa gì cho học sinh (không thêm cột DB, không migration). Cô đã xác nhận không cần khóa.
- Không lưu hay theo dõi học sinh đã chơi gì. Không đồng bộ tài khoản với web kia.
- Không sửa web Study with Bông.

## Điều đã kiểm tra

- Trang tổng hợp, 5 đích đến (3 game netlify, 2 sách heyzine) đều trả HTTP 200 và **không có** `X-Frame-Options`, `Content-Security-Policy` hay `frame-ancestors`. Trang tổng hợp không có mã chống nhúng (không `window.top`, không meta CSP). Nhúng được.
- Các link đi ra của web kia dùng `target="_blank"`, nên trong khung nhúng vẫn mở tab mới, không tự nhảy cả web lớp.
- Mục "Rạp Phim Mini" hiện chưa có video nào được liệt kê.
- Điểm đã nghĩ lại: lúc đầu mình lo game bị chật trong khung. Điều đó không còn đúng vì game mở ở tab riêng. Chỉ còn trang tổng hợp nằm trong khung.

## Các cách đã cân nhắc

| Cách | Đánh đổi |
|---|---|
| A. Link mở tab mới | Đơn giản nhất, nhưng thêm một tab trung gian trước khi vào game. |
| B. A + công tắc cho học sinh | Cần migration, sửa Cài đặt. Chưa có nhu cầu. |
| **C. Nhúng trang tổng hợp (cô chọn)** | Ít tab nhất, giữ menu lớp. Phụ thuộc web kia còn cho nhúng. |

Chọn C. Rủi ro: nếu sau này web Study with Bông thêm chặn nhúng thì khung trắng. Giảm thiểu bằng nút "Mở trong tab mới" luôn hiện trên trang.

## Thiết kế

- Hai trang, cùng một thành phần: `/kho-hoc-lieu` (nhóm `(teacher)`, có `requireTeacher`) và `/em/kho-hoc-lieu` (cổng học sinh, theo layout `/em`).
- Thành phần dùng chung: tiêu đề trang, một nút "Mở trong tab mới" (link `<a target="_blank" rel="noopener noreferrer">`), và một `<iframe>` chiếm hết chiều cao còn lại của vùng nội dung, có `title`, `loading="lazy"`, `allow="fullscreen"`. Có `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"`: không có `allow-top-navigation*`, nên trang nhúng không tự chuyển được cả trang lớp (nguy cơ giả trang đăng nhập), còn link `_blank` vẫn mở tab mới bình thường nhờ `allow-popups-to-escape-sandbox`. (Bản đầu của tài liệu này nói "không dùng sandbox" vì tưởng sandbox làm hỏng link tab mới; review sau khi làm xong đã sửa lại điều đó.)
- Địa chỉ web: hằng số/biến cấu hình dùng chung, mặc định **`https://studywithbong.netlify.app/#/khoi/5`** (mở thẳng "Góc học tập Lớp 5", theo yêu cầu của cô), ghi đè được bằng `NEXT_PUBLIC_LEARNING_HUB_URL`. Đã kiểm tra: đường dẫn này tải đúng và liệt kê 11 nội dung; bên trong trang vẫn chuyển được sang các khối lớp khác. Nút "Mở trong tab mới" cũng dùng địa chỉ này.
- Menu cô: thêm mục `{ id: 'hub', label: 'Kho học liệu', href: '/kho-hoc-lieu' }` vào `TEACHER_NAV` và `TEACHER_NAV_META`, nhóm **"Công cụ"** (cạnh "Chế độ trình chiếu", "Thống kê – Báo cáo").
- Menu học sinh: thêm `hub` vào `StudentPageId`, `STUDENT_NAV`, `STUDENT_TITLES`, `STUDENT_NAV_TONES`; luôn có trong `visibleStudentPages`. Hiện đã 7 mục, thêm mục thứ 8 thì trên điện thoại nằm trong "Thêm" (đã có sẵn cơ chế).
- Biểu tượng: một icon quyển sách/trò chơi cùng kiểu path SVG như các mục khác.
- Trình chiếu (`/trinh-chieu`) không đổi.

## Để người làm quyết định

- Chọn chính xác path SVG của icon và tông màu pastel cho mục.
- Chiều cao khung trên điện thoại (trừ thanh tab dưới đáy của học sinh).
- Nội dung chữ giải thích nhỏ (nếu có) trên trang, tiêu đề dành cho học sinh (theo giọng "phi hành gia" của các trang khác).
- Test: cập nhật các test đang đếm số mục menu, thêm test cho hai trang mới.
