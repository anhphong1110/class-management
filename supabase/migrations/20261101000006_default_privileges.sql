-- Hàm mới tạo trong schema public không tự cấp EXECUTE cho anon/public.
-- (Bản global cần thiết: PUBLIC có EXECUTE từ mặc định toàn cục của Postgres, bản in-schema không gỡ được.)
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- Các view chỉ đọc: authenticated chỉ có SELECT.
revoke all on public.v_student_stars, public.v_leaderboard_public, public.v_my_star_history from authenticated;
grant select on public.v_student_stars, public.v_leaderboard_public, public.v_my_star_history to authenticated;

-- Không ai ngoài vai trò dịch vụ được TRUNCATE.
revoke truncate on all tables in schema public from anon, authenticated;
