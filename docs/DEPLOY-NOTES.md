# Ghi chú triển khai

## Tạo tài khoản giáo viên trên production

- Biến môi trường production nằm trong `.env.production.local` (không commit).
- `pnpm create-teacher` đọc `.env.local` (Supabase cục bộ). Với production phải chạy:

  ```
  TEACHER_PASSWORD='...' pnpm create-teacher:prod --username co.khanh --name "Cô Khanh"
  ```

  tương đương `tsx --env-file=.env.production.local scripts/create-teacher.ts ...`.
- `pnpm seed:dev` từ chối chạy nếu `NEXT_PUBLIC_SUPABASE_URL` không phải `127.0.0.1` hoặc `localhost`.
