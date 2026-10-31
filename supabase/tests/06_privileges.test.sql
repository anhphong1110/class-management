begin;
select plan(6);

create function public.__t() returns int language sql as 'select 1';

select ok(not has_function_privilege('anon', 'public.__t()', 'execute'), 'hàm mới: anon không có EXECUTE');

select ok(not has_table_privilege('authenticated', 'public.v_student_stars', 'insert,update,delete'), 'authenticated không ghi được v_student_stars');
select ok(not has_table_privilege('authenticated', 'public.v_leaderboard_public', 'insert,update,delete'), 'authenticated không ghi được v_leaderboard_public');
select ok(not has_table_privilege('authenticated', 'public.v_my_star_history', 'insert,update,delete'), 'authenticated không ghi được v_my_star_history');
select ok(has_table_privilege('authenticated', 'public.v_leaderboard_public', 'select'), 'authenticated vẫn đọc được v_leaderboard_public');
select ok(not has_table_privilege('anon', 'public.students', 'truncate'), 'anon không có TRUNCATE trên students');

select * from finish();
rollback;
