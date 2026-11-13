# Màn chờ khi tải trang và đăng nhập — thiết kế ngắn

Ngày: 2026-11-13 · Cỡ việc: thay đổi nhỏ

## Vì sao

Mở trang hoặc đăng nhập xong, màn hình đứng im vài giây không có dấu hiệu gì, người dùng tưởng app bị lag.
Cần cho thấy rõ là app đang tải. Kiểu đã chọn: **tên lửa (khi đăng nhập) + khung xương (khi chuyển trang)**.

## Hiện trạng (đã kiểm tra)

- Cả app chưa có `loading.tsx`. `components/ui/Skeleton.tsx` có `PageSkeleton` nhưng chưa nơi nào dùng.
- Nút "Cất cánh" (`LoginForm`) **đã** giữ spinner "Đang bay…" cho đến khi trang mới hiện xong (đo trên Next 15.5.28).
  Hai nút vào nhanh (`DemoButtons`) chỉ mờ đi, không có dấu hiệu gì.
- Đo trên Next 15.5.28: có `loading.tsx` bọc một trang gọi `notFound()` thì mã trả về là **200** thay vì 404.
  Áp dụng cho cả `app/loading.tsx` lẫn `app/em/loading.tsx`.
  7 trang học sinh gọi `requireStudentPage()` và các e2e đang kiểm tra 404
  (`student-pages`, `settings`, `student-portal`).
- Trang trong khu cô giáo không gọi `notFound()` hay `redirect()`. `requireTeacher()` nằm ở layout, tức là ngoài vùng chờ.

## Mục tiêu / không làm / tránh

- **Mục tiêu:**
  - Đăng nhập (cả hai kiểu nút) có màn tên lửa.
  - Chuyển trang trong khu cô giáo và trong khu học sinh có khung xương.
  - Link chuyển giữa hai khu và link vào/ra chế độ trình chiếu có spinner.
- **Không làm:**
  - Thanh tiến trình trên cùng.
  - Tăng tốc truy vấn Supabase.
  - Khoảng trắng trước byte đầu tiên khi mới mở web (server khởi động, mạng tới Ireland).
  - `loading.tsx` cho `/dang-nhap`: trang lấy dữ liệu nhanh, màn chờ chỉ nháy lên rồi tắt.
- **Tránh:**
  - Làm trang bị cô tắt mất mã 404 thật khi mở thẳng link.
  - Đổi các lần chuyển hướng ở layout (`requireTeacher`, `getStudentContext`) sang kiểu chuyển phía trình duyệt.
  - Vì vậy **không** tạo `app/loading.tsx`.

## Cách làm đã xét

1. **`loading.tsx` ở gốc + từng khu, chấp nhận mã 200:** gọn nhất, nhưng bỏ 404 thật và đổi cách chuyển hướng. Loại.
2. **Khu học sinh chỉ có `loading.tsx`, sửa test sang kiểm nội dung:** đơn giản, nhưng bỏ hành vi mà code ghi rõ là cố ý
   ("Trang bị cô tắt thì 404 ngay trên máy chủ"). Loại.
3. **(Đã chọn) Giữ 404 thật:** kiểm tra cờ trang được làm thêm ở layout học sinh, tức là ngoài vùng chờ.
   Màn tên lửa lúc đăng nhập là lớp phủ phía trình duyệt, không dùng `loading.tsx`.

## Thiết kế

1. **Tên lửa khi đăng nhập:** component client mới, ví dụ `LaunchOverlay`, trong `app/(auth)/dang-nhap/`.
   - Hiện khi `pending` của `LoginForm` hoặc `DemoButtons` là `true`.
   - Phủ toàn màn hình, nền không gian lấy theo bảng màu `.sp`, có `ten-lua.webp` lơ lửng và chữ "Đang chuẩn bị trạm…".
   - `role="status"`. Tắt chuyển động khi người dùng chọn giảm chuyển động. Màu để trong `login.css`, không gõ mã hex vào `.tsx`.
   - Nhờ cơ chế giữ `pending` đã đo ở trên, lớp phủ tự biến mất khi trang mới hiện. Nếu đăng nhập lỗi thì `pending` về `false`, lớp phủ tắt và lỗi hiện như bây giờ.
2. **Nút vào nhanh:** nút được bấm có spinner và chữ "Đang bay…", giống nút "Cất cánh".
3. **Khu cô giáo:** `app/(teacher)/loading.tsx` trả về `<PageSkeleton />`. Menu vẫn hiện vì nằm ở layout.
4. **Khu học sinh, giữ 404 thật:**
   - `middleware` luôn **ghi đè** header request `x-pathname` bằng pathname thật. Ghi đè chứ không thêm vào, để client không giả được.
   - Hàm thuần mới trong `lib/student/flags.ts`, ví dụ `studentPageForPath(pathname)`, trả `StudentPageId | null`.
     Hàm dựa vào `STUDENT_NAV`: `/em` khớp chính xác, các mục khác khớp đúng href hoặc href + `/...`.
   - `app/em/layout.tsx`: đọc `x-pathname`. Nếu ra một trang không nằm trong `visibleStudentPages(ctx.settings)` thì gọi `notFound()` trước khi render. Lúc này vẫn ngoài vùng chờ nên giữ được 404.
   - **Giữ nguyên** `requireStudentPage()` trong từng trang. Khi chuyển trang trong app, layout không chạy lại nên trang vẫn tự chặn (lúc đó mã trả về không quan trọng).
   - `app/em/loading.tsx` trả về `<PageSkeleton />`.
5. **Link chuyển khu có spinner:** khi vào một khu mới, layout của khu đó chạy trước, nên khung xương ở mục 3–4 chưa kịp hiện.
   Phần này cũng không có `app/loading.tsx` che (xem phần "Tránh").
   - Component client nhỏ, ví dụ `LinkPendingIcon` trong `components/ui/`, dùng `useLinkStatus()` của `next/link`. Next 15.5 đã có hook này.
   - Khi đang chuyển trang, component đổi icon của link thành spinner (`ICONS.spinner` + `motion-safe:animate-spin`), và báo cho đọc màn hình biết là đang tải.
   - Spinner hiện trễ khoảng 100ms để không nháy khi trang đã được tải sẵn.
   - Đặt bên trong các link sau:
     - Cô → học sinh: `components/layout/Sidebar.tsx` (nút "Xem như học sinh"), `components/layout/Header.tsx` (icon mắt), `app/(teacher)/cai-dat/SettingsClient.tsx` (`ButtonLink` tới `/em`).
     - Cô → trình chiếu: mục "Chế độ trình chiếu" trong menu `Sidebar.tsx`. Chỉ mục này có spinner, các mục trong khu đã có khung xương.
     - Học sinh → cô: "Quay lại trang cô giáo" trong `app/em/layout.tsx`.
     - Trình chiếu → cô: `app/trinh-chieu/page.tsx` và `app/trinh-chieu/DisplayClient.tsx` (link về `/tong-quan`).
   - Trang cũ vẫn hiện cho đến khi trang mới xong. Không đụng gì tới mã trả về.

## Kiểm tra

- Unit (vitest):
  - `studentPageForPath`: `/em`, `/em/xep-hang`, đường dẫn con, đường dẫn lạ.
  - `LaunchOverlay` render `role="status"`.
  - `LinkPendingIcon`: giả lập `useLinkStatus` để kiểm tra lúc đang chuyển thì hiện spinner, lúc thường thì hiện icon gốc.
  - Hex guard vẫn đạt.
- E2E chạy lại, không viết test mới cho màn chờ vì nó hiện rất nhanh nên test dễ lúc đạt lúc không:
  - các test 404 trong `student-pages.spec.ts`, `settings.spec.ts`, `student-portal.spec.ts`;
  - `login.spec.ts`, `accounts.spec.ts`.
- Xem bằng trình duyệt: bấm đăng nhập, chuyển trang ở cả hai khu, bấm "Xem như học sinh" và vào/ra chế độ trình chiếu.

## Để người làm tự quyết (đã ghi là lựa chọn của mình)

- **Cách gắn header trong `updateSession`:** `NextResponse.next({ request: { headers } })` hoặc cách tương đương. Phải giữ đúng các lần làm mới cookie phiên đang có.
- **Lớp phủ hiện trễ khoảng 300ms** (fade bằng `animation-delay`), để lần nhập sai mật khẩu không bị nháy cả màn hình. Spinner trên nút vẫn hiện ngay.
- **Lớp phủ nằm trên cả nút chat (`ChatWidget`)** về thứ tự lớp (z-index).
- **Nếu thiếu `x-pathname`** (ví dụ middleware không chạy) thì layout bỏ qua bước kiểm tra. Trang vẫn tự chặn.
