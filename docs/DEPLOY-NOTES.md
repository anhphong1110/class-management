# Ghi chú triển khai chạy thật

Làm lần lượt từng bước. Mọi bước chạm vào Supabase hoặc Vercel thật đều do bạn tự làm; đợt 6 chưa chạy migration lên project thật.

## Trước khi bắt đầu

- Có project Supabase (hosted) và tài khoản Vercel.
- Máy có `pnpm` và repo này đã `pnpm install` (Supabase CLI đi kèm repo, gọi bằng `pnpm supabase`).
- Danh sách migration kết thúc ở `20261101000020_backup_year.sql` (20 file). Nếu `supabase/migrations` có file sau số 0020 thì đọc lại trước khi đẩy.

## Các bước

1. **Kiểm phiên bản Postgres.** Dashboard Supabase → Project Settings → Infrastructure. Postgres phải từ 15 trở lên. Thấp hơn thì nâng cấp trước khi làm tiếp.

2. **Đẩy migration (bạn tự chạy).**
   ```
   pnpm supabase link --project-ref <project-ref>
   pnpm supabase db push
   ```
   Lệnh này chạy 20 migration (0001 đến 0020) lên project thật. Đừng chạy `supabase db reset` và đừng nạp `seed.sql`: production không có dữ liệu demo.

3. **Cấu hình Auth.** Dashboard → Authentication:
   - Sign In / Providers: bật Email provider.
   - Sign In / Providers (mục User Signups): tắt "Allow new users to sign up".
   - Email provider: tắt "Confirm email".
   - **Rate Limits** (Authentication → Rate Limits): tăng giới hạn `sign_in_sign_ups`. Mặc định là 30 lần mỗi 5 phút mỗi IP. Ứng dụng gọi `signInWithPassword` từ phía server trên Vercel nên mọi lượt đăng nhập đi qua cùng một vài IP của Vercel. 40 học sinh cùng đăng nhập sẽ vượt mức mặc định và bị báo lỗi 429. Đặt cao hơn, ví dụ 200 mỗi 5 phút.
   - URL Configuration: đặt Site URL là tên miền Vercel (ví dụ `https://ten-du-an.vercel.app`, sau này đổi sang tên miền riêng) và thêm cùng địa chỉ đó (kèm `/**`) vào Redirect URLs.

   - Data API (Project Settings → Data API): chỉ để schema `public` (và `graphql_public` nếu có) trong "Exposed schemas". **Không bao giờ** thêm schema `private`: các hàm trong đó không dành cho gọi trực tiếp.

4. **Kiểm Storage.** Dashboard → Storage. Migration đã tạo hai bucket riêng tư: `class-media` (0004, ảnh tối đa 5 MB) và `class-backups` (0020, file JSON tối đa 20 MB). Nếu thiếu bucket nào thì migration chưa chạy đủ; quay lại bước 2.

5. **Tạo lớp và tài khoản giáo viên.**
   - Sao `.env.production.example` thành `.env.production.local`, điền giá trị thật (URL, anon key, service role key lấy ở Project Settings → API).
   - `AUTH_EMAIL_DOMAIN` ở đây phải giống hệt giá trị sẽ đặt trên Vercel ở bước 6. Sai khác thì giáo viên và học sinh không đăng nhập được.
   - Điền `SCHOOL_NAME`, `CLASS_NAME`, `SCHOOL_YEAR`, `TEACHER_NAME`, `TEACHER_USERNAME`, `TEACHER_PASSWORD` (tối thiểu 8 ký tự). Ngày học kỳ `TERM1_START`, `TERM1_END`, `TERM2_START`, `TERM2_END` (dạng `YYYY-MM-DD`) là tùy chọn; bỏ trống thì đặt sau trong Cài đặt.
   - Chạy:
     ```
     pnpm bootstrap:prod
     ```
   - Script tạo lớp (giao diện màu indigo), 12 avatar preset, tài khoản giáo viên và đặt chủ sở hữu lớp. Mật khẩu không bao giờ được in ra.
   - Chạy lại khi lớp cùng tên và năm học đã có: script dừng và báo, không tạo trùng.
   - Xong thì xóa dòng `TEACHER_PASSWORD` khỏi `.env.production.local`. File này đã nằm trong `.gitignore`, không commit.

6. **Vercel.** Tạo project từ repo. Đặt đúng 4 biến môi trường (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_EMAIL_DOMAIN` (giống hệt giá trị lúc chạy bootstrap)

   Các biến `SCHOOL_NAME`, `CLASS_NAME`, `TEACHER_*`, `TERM*` không đặt lên Vercel.

7. **Duyệt bản preview, rồi gắn tên miền.** Mở bản preview, đi qua bảng kiểm tra bên dưới. Ổn thì gắn tên miền riêng ở Settings → Domains, sau đó cập nhật Site URL và Redirect URLs ở bước 3 cho khớp.

8. **Sau khi chạy thật.** Đăng nhập bằng tài khoản giáo viên, vào Cài đặt:
   - Không cần "Xóa dữ liệu demo" vì production không nạp dữ liệu demo.
   - Thêm học sinh, rồi dùng "Tạo tài khoản hàng loạt".
   - In mật khẩu tạm ngay lúc đó: mật khẩu chỉ hiện một lần, không được lưu.

9. **Ghi chú vận hành.**
   - Advisor của Supabase sẽ cảnh báo `security_definer_view` cho các view `v_*`. Đây là cố ý, bỏ qua.
   - Vercel giới hạn request và response 4,5 MB. Vì vậy sao lưu đi qua Storage (bucket `class-backups`) chứ không qua body của request.
   - Mỗi năm học cập nhật ngày học kỳ trong Cài đặt.
   - Sao lưu định kỳ (Cài đặt → Sao lưu), nhất là trước khi mở năm học mới.
   - Nếu học sinh cùng đăng nhập mà gặp lỗi 429: tăng giới hạn ở bước 3 (Authentication → Rate Limits).

10. **Bảng kiểm tra sau triển khai.**
    - [ ] Cô đăng nhập được.
    - [ ] Tạo 1 học sinh.
    - [ ] Tạo tài khoản cho học sinh đó.
    - [ ] Học sinh đăng nhập được.
    - [ ] Cộng sao cho học sinh.
    - [ ] Học sinh đổi quà.
    - [ ] Cô duyệt yêu cầu đổi quà.
