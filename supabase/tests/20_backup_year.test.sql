begin;
select plan(122);

create function pg_temp.u(h text) returns uuid language sql immutable
as $$ select ('00000000-0000-0000-0000-' || lpad(h, 12, '0'))::uuid $$;
grant execute on function pg_temp.u(text) to public;
create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;
create function pg_temp.cnt(t text, c uuid) returns bigint language plpgsql
as $$ declare n bigint; begin execute format('select count(*) from public.%I where class_id = $1', t) into n using c; return n; end $$;
grant execute on function pg_temp.cnt(text, uuid) to public;
create function pg_temp.overlap(t text, a uuid, b uuid) returns bigint language plpgsql
as $$
declare n bigint;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'id') then
    return 0;
  end if;
  execute format('select count(*) from public.%I x join public.%I y on x.id = y.id where x.class_id = $1 and y.class_id = $2', t, t) into n using a, b;
  return n;
end $$;
grant execute on function pg_temp.overlap(text, uuid, uuid) to public;

-- Mọi bảng thật có cột class_id, trừ profiles và audit_logs (tự liệt kê, để không sót bảng nào).
create temp table bk_tables as
  select c.table_name::text as t
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
   where c.table_schema = 'public' and c.column_name = 'class_id' and c.table_name not in ('profiles', 'audit_logs');
grant select on bk_tables to public;

-- ===== dữ liệu thử =====
insert into auth.users (id, email) values
  (pg_temp.u('d1'), 't@test.local'), (pg_temp.u('d2'), 't2@test.local'), (pg_temp.u('d3'), 'a1@test.local');
insert into public.classes (id, school_name, class_name, school_year, teacher_name, slogan, logo_path, cover_path, owner_id,
                            term1_start, term1_end) values
  (pg_temp.u('c1'), 'Trường A', '5A', '2026 – 2027', 'Cô T', 'Cùng nhau', pg_temp.u('c1') || '/branding/logo.png',
   pg_temp.u('c2') || '/branding/cover.png', pg_temp.u('d1'), '2026-09-05', '2027-01-15'),
  (pg_temp.u('c2'), 'Trường B', '5B', '2026 – 2027', 'Cô T2', '', null, null, pg_temp.u('d2'), null, null);
update public.class_settings set weekly_redeem_limit = 7, timetable_saturday = true, star_steps = '{1,2}', require_approval = false
 where class_id = pg_temp.u('c1');

insert into public.avatar_library (id, class_id, kind, preset, image_path, label) values
  (pg_temp.u('e1'), pg_temp.u('c1'), 'preset', '{"bg":"#fff"}', null, 'preset 1'),
  (pg_temp.u('e2'), pg_temp.u('c1'), 'upload', null, pg_temp.u('c1') || '/avatars/x.png', 'tải lên');
insert into public.students (id, class_id, code, roll_no, full_name, avatar_id, archived_at) values
  (pg_temp.u('a1'), pg_temp.u('c1'), 'HS01', 1, 'A1', pg_temp.u('e2'), null),
  (pg_temp.u('a2'), pg_temp.u('c1'), 'HS02', 2, 'A2', null, null),
  (pg_temp.u('a3'), pg_temp.u('c1'), 'HS03', 3, 'A3 lưu trữ', null, now()),
  (pg_temp.u('b1'), pg_temp.u('c2'), 'HS01', 1, 'B1', null, null);
insert into public.profiles (id, class_id, role, username, display_name, avatar_id, student_id) values
  (pg_temp.u('d1'), pg_temp.u('c1'), 'teacher', 'co.t', 'Cô T', pg_temp.u('e1'), null),
  (pg_temp.u('d2'), pg_temp.u('c2'), 'teacher', 'co.t2', 'Cô T2', null, null),
  (pg_temp.u('d3'), pg_temp.u('c1'), 'student', 'hs.a1', 'A1', null, pg_temp.u('a1'));
insert into public.groups (id, class_id, name) values (pg_temp.u('f1'), pg_temp.u('c1'), 'Tổ 1');
insert into public.group_members (class_id, group_id, student_id, role) values
  (pg_temp.u('c1'), pg_temp.u('f1'), pg_temp.u('a1'), 'leader'),
  (pg_temp.u('c1'), pg_temp.u('f1'), pg_temp.u('a2'), 'member');
insert into public.star_criteria (id, class_id, label, kind, default_points) values
  (pg_temp.u('11'), pg_temp.u('c1'), 'Giơ tay', 'award', 1),
  (pg_temp.u('12'), pg_temp.u('c1'), 'Nói chuyện', 'penalty', 2);
insert into public.rewards (id, class_id, name, cost, stock, image_path) values
  (pg_temp.u('21'), pg_temp.u('c1'), 'Bút', 5, 3, pg_temp.u('c1') || '/rewards/r.png'),
  (pg_temp.u('22'), pg_temp.u('c1'), 'Vở', 4, 2, null);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status, decided_by, decided_at) values
  (pg_temp.u('31'), pg_temp.u('c1'), pg_temp.u('a1'), pg_temp.u('21'), 5, 'pending', null, null),
  (pg_temp.u('32'), pg_temp.u('c1'), pg_temp.u('a2'), pg_temp.u('22'), 4, 'approved', pg_temp.u('d1'), now());
insert into public.star_transactions (id, class_id, student_id, delta, kind, criterion_id, reward_request_id, reverses_id, batch_id, actor_id, created_at) values
  (pg_temp.u('41'), pg_temp.u('c1'), pg_temp.u('a1'), 10, 'award', pg_temp.u('11'), null, null, pg_temp.u('91'), pg_temp.u('d1'), now() - interval '5 days'),
  (pg_temp.u('42'), pg_temp.u('c1'), pg_temp.u('a1'), -2, 'penalty', pg_temp.u('12'), null, null, pg_temp.u('92'), pg_temp.u('d1'), now() - interval '4 days'),
  -- hoàn tác có cùng created_at với bản gốc: thứ tự chèn phải đặt hoàn tác sau
  (pg_temp.u('43'), pg_temp.u('c1'), pg_temp.u('a1'), 2, 'reversal', null, null, pg_temp.u('42'), pg_temp.u('93'), pg_temp.u('d1'), now() - interval '4 days'),
  (pg_temp.u('44'), pg_temp.u('c1'), pg_temp.u('a2'), 8, 'award', null, null, null, pg_temp.u('94'), pg_temp.u('d1'), now() - interval '5 days'),
  (pg_temp.u('45'), pg_temp.u('c1'), pg_temp.u('a1'), -5, 'reserve', null, pg_temp.u('31'), null, null, pg_temp.u('d3'), now() - interval '2 days'),
  (pg_temp.u('46'), pg_temp.u('c1'), pg_temp.u('a2'), -4, 'reserve', null, pg_temp.u('32'), null, null, pg_temp.u('d1'), now() - interval '2 days'),
  (pg_temp.u('47'), pg_temp.u('c1'), pg_temp.u('a3'), 3, 'award', null, null, null, pg_temp.u('95'), pg_temp.u('d1'), now() - interval '1 day'),
  (pg_temp.u('48'), pg_temp.u('c2'), pg_temp.u('b1'), 9, 'award', null, null, null, pg_temp.u('96'), null, now());
insert into public.attendance (class_id, student_id, date, status) values
  (pg_temp.u('c1'), pg_temp.u('a1'), '2026-10-30', 'present'), (pg_temp.u('c1'), pg_temp.u('a2'), '2026-10-30', 'late');
insert into public.subjects (id, class_id, name) values (pg_temp.u('51'), pg_temp.u('c1'), 'Toán');
insert into public.timetable_slots (class_id, weekday, session, period, subject_id) values
  (pg_temp.u('c1'), 1, 'morning', 1, pg_temp.u('51')), (pg_temp.u('c1'), 6, 'afternoon', 1, null);
insert into public.announcements (id, class_id, title, body, image_path) values
  (pg_temp.u('81'), pg_temp.u('c1'), 'Họp phụ huynh', 'x', pg_temp.u('c1') || '/announcements/n.png'),
  (pg_temp.u('82'), pg_temp.u('c1'), 'Ảnh lạ', 'y', pg_temp.u('c1') || '/announcements/../../secret.png');
insert into public.missions (id, class_id, name, period, reward_stars) values (pg_temp.u('61'), pg_temp.u('c1'), 'M1', 'week', 3);
insert into public.mission_completions (class_id, mission_id, student_id, period_key, star_transaction_id) values
  (pg_temp.u('c1'), pg_temp.u('61'), pg_temp.u('a1'), '2026-W44', pg_temp.u('41'));
insert into public.badges (id, class_id, name) values (pg_temp.u('71'), pg_temp.u('c1'), 'Ngôi sao');
insert into public.student_badges (class_id, badge_id, student_id, awarded_by) values
  (pg_temp.u('c1'), pg_temp.u('71'), pg_temp.u('a1'), pg_temp.u('d1'));

create temp table bal_before as
  select s.code, coalesce(sum(t.delta), 0)::bigint as avail,
         coalesce(sum(t.delta) filter (where t.kind in ('award', 'penalty', 'reversal')), 0)::bigint as comp
    from public.students s
    left join public.star_transactions t on t.class_id = s.class_id and t.student_id = s.id
   where s.class_id = pg_temp.u('c1') group by s.code;
grant select on bal_before to public;

select is((select count(*)::int from bk_tables where pg_temp.cnt(t, pg_temp.u('c1')) = 0), 0, 'dữ liệu thử có ít nhất một dòng ở mọi bảng');
select cmp_ok((select count(*)::int from bk_tables), '=', 17, 'liệt kê được các bảng có class_id');

-- ===== quyền hàm =====
select ok(has_function_privilege('authenticated', 'public.export_class_backup(uuid)', 'execute'), 'authenticated gọi được export_class_backup');
select ok(not has_function_privilege('anon', 'public.export_class_backup(uuid)', 'execute'), 'anon không gọi được export_class_backup');
select ok(has_function_privilege('authenticated', 'public.restore_class_backup(jsonb, uuid)', 'execute'), 'authenticated gọi được restore_class_backup');
select ok(not has_function_privilege('anon', 'public.restore_class_backup(jsonb, uuid)', 'execute'), 'anon không gọi được restore_class_backup');
select ok(has_function_privilege('authenticated', 'public.my_archived_classes()', 'execute'), 'authenticated gọi được my_archived_classes');
select ok(not has_function_privilege('anon', 'public.my_archived_classes()', 'execute'), 'anon không gọi được my_archived_classes');
select ok(not has_function_privilege('authenticated', 'private.close_class(uuid)', 'execute'), 'authenticated không gọi được private.close_class');
select ok(not has_function_privilege('anon', 'private.close_class(uuid)', 'execute'), 'anon không gọi được private.close_class');

-- ===== xuất =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d3'));
select throws_ok($$select public.export_class_backup('00000000-0000-0000-0000-0000000000c1')$$, 'P0001', 'not_allowed', 'học sinh xuất: not_allowed');
select throws_ok($$select public.restore_class_backup('{}'::jsonb)$$, 'P0001', 'not_allowed', 'học sinh khôi phục: not_allowed');
select throws_ok($$select * from public.my_archived_classes()$$, 'P0001', 'not_allowed', 'học sinh xem năm đã lưu trữ: not_allowed');
select pg_temp.as_user(pg_temp.u('d2'));
select throws_ok($$select public.export_class_backup('00000000-0000-0000-0000-0000000000c1')$$, 'P0001', 'not_allowed', 'giáo viên không sở hữu lớp: not_allowed');
select lives_ok($$select public.export_class_backup('00000000-0000-0000-0000-0000000000c2')$$, 'giáo viên xuất lớp của mình');
select is((select count(*)::int from public.my_archived_classes()), 0, 'chưa có năm học lưu trữ');
select pg_temp.as_user(pg_temp.u('d1'));
select set_config('app.bk', public.export_class_backup(pg_temp.u('c1'))::text, true);
reset role;
create temp table bk as select current_setting('app.bk')::jsonb as j;
grant select on bk to public;

select is((select j ->> 'format' from bk), 'tram-khong-gian-backup', 'format');
select is((select (j -> 'version') from bk), '1'::jsonb, 'version là số 1');
select ok((select j ->> 'exported_at' is not null from bk), 'có exported_at');
select is((select j #>> '{class,class_name}' from bk), '5A', 'class.class_name');
select is((select j #>> '{class,id}' from bk), pg_temp.u('c1')::text, 'class.id');
select is((select array_agg(k order by k) from bk, jsonb_object_keys(j -> 'tables') k),
          (select array_agg(t order by t) from bk_tables), 'tables gồm đúng mọi bảng có class_id');
select ok(not (select (j -> 'tables') ? 'profiles' or (j -> 'tables') ? 'audit_logs' from bk), 'không có profiles, audit_logs');
select is((select jsonb_array_length(j #> '{tables,star_transactions}') from bk), 7, 'chỉ sổ sao của lớp này (7 dòng)');
select is((select jsonb_array_length(j #> '{tables,students}') from bk), 3, 'học sinh kể cả đã lưu trữ');
select ok(not (select (j -> 'class') ? 'owner_id' from bk), 'không xuất owner_id');

-- ===== khôi phục sai định dạng: báo invalid_backup, không đổi gì =====
create temp table state_before as
  select (select count(*) from public.classes) as classes, (select count(*) from public.students) as students,
         (select class_id from public.profiles where id = pg_temp.u('d1')) as teacher_class;
grant select on state_before to public;
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select throws_ok($$select public.restore_class_backup('{}'::jsonb)$$, 'P0001', 'invalid_backup', 'JSON {} -> invalid_backup');
select throws_ok($$select public.restore_class_backup('{"a":1}'::jsonb)$$, 'P0001', 'invalid_backup', 'JSON {"a":1} -> invalid_backup');
select throws_ok($$select public.restore_class_backup('null'::jsonb)$$, 'P0001', 'invalid_backup', 'JSON null -> invalid_backup');
select throws_ok($$select public.restore_class_backup('[]'::jsonb)$$, 'P0001', 'invalid_backup', 'JSON mảng -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{version}', '2'))$$, 'P0001', 'invalid_backup', 'version 2 -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{version}', '"1"'))$$, 'P0001', 'invalid_backup', 'version chuỗi "1" -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{format}', '"khac"'))$$, 'P0001', 'invalid_backup', 'sai format -> invalid_backup');
select throws_ok($$select public.restore_class_backup(current_setting('app.bk')::jsonb #- '{tables,rewards}')$$, 'P0001', 'invalid_backup', 'thiếu bảng -> invalid_backup');
select throws_ok($$select public.restore_class_backup(current_setting('app.bk')::jsonb #- '{class}')$$, 'P0001', 'invalid_backup', 'thiếu class -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,rewards}', '{}'))$$, 'P0001', 'invalid_backup', 'bảng không phải mảng -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,rewards}', '[1]'))$$, 'P0001', 'invalid_backup', 'dòng không phải object -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,students,0,id}', '"khong-phai-guid"'))$$, 'P0001', 'invalid_backup', 'id không phải GUID -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,class_settings}', '[]'))$$, 'P0001', 'invalid_backup', 'class_settings rỗng -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,class_settings}', (current_setting('app.bk')::jsonb #> '{tables,class_settings}') || (current_setting('app.bk')::jsonb #> '{tables,class_settings}')))$$, 'P0001', 'invalid_backup', 'class_settings hai dòng -> invalid_backup');
-- Sai ở tầng dữ liệu (qua kiểm tra hình dạng nhưng vi phạm ràng buộc) cũng là invalid_backup và hoàn tác trọn vẹn.
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,star_transactions,0,delta}', '0'))$$, 'P0001', 'invalid_backup', 'delta 0 -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,students,0,avatar_id}', to_jsonb(gen_random_uuid()::text)))$$, 'P0001', 'invalid_backup', 'khóa ngoại mồ côi -> invalid_backup');
select throws_ok($$select public.restore_class_backup(jsonb_set(current_setting('app.bk')::jsonb, '{tables,star_transactions,0,delta}', '"abc"'))$$, 'P0001', 'invalid_backup', 'sai kiểu dữ liệu -> invalid_backup');
reset role;
select is((select count(*) from public.classes), (select classes from state_before), 'không tạo lớp nào khi file sai');
select is((select count(*) from public.students), (select students from state_before), 'không thêm học sinh khi file sai');
select is((select class_id from public.profiles where id = pg_temp.u('d1')), (select teacher_class from state_before), 'giáo viên vẫn ở lớp cũ khi file sai');
select is((select archived_at from public.classes where id = pg_temp.u('c1')), null, 'lớp cũ chưa bị lưu trữ khi file sai');

-- ===== kho tạm class-backups =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('class-backups', '00000000-0000-0000-0000-0000000000c1/x.json', '00000000-0000-0000-0000-0000000000d1')$$, 'giáo viên lưu file sao lưu vào thư mục lớp mình');
select is((select count(*)::int from storage.objects where bucket_id = 'class-backups'), 1, 'giáo viên thấy file của lớp mình');
select pg_temp.as_user(pg_temp.u('d2'));
select throws_ok($$insert into storage.objects (bucket_id, name) values ('class-backups', '00000000-0000-0000-0000-0000000000c1/y.json')$$, '42501', null, 'giáo viên lớp khác không lưu vào thư mục lớp này');
select is((select count(*)::int from storage.objects where bucket_id = 'class-backups'), 0, 'giáo viên lớp khác không thấy file');
select pg_temp.as_user(pg_temp.u('d3'));
select throws_ok($$insert into storage.objects (bucket_id, name) values ('class-backups', '00000000-0000-0000-0000-0000000000c1/z.json')$$, '42501', null, 'học sinh không lưu được vào class-backups');
select is((select count(*)::int from storage.objects where bucket_id = 'class-backups'), 0, 'học sinh không đọc được class-backups');
reset role;

-- ===== khôi phục thật =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select set_config('app.res', public.restore_class_backup(current_setting('app.bk')::jsonb)::text, true);
reset role;
create temp table res as select current_setting('app.res')::jsonb as j;
grant select on res to public;
create temp table newc as select (j ->> 'classId')::uuid as id from res;
grant select on newc to public;

select ok((select id is not null and id <> pg_temp.u('c1') from newc), 'trả classId của lớp mới');
select is((select count(*)::int from public.classes where id = (select id from newc)), 1, 'có lớp mới');
select is((select owner_id from public.classes where id = (select id from newc)), pg_temp.u('d1'), 'owner_id là giáo viên gọi');
select is((select class_name || '|' || school_year || '|' || school_name || '|' || teacher_name || '|' || slogan from public.classes where id = (select id from newc)),
          '5A|2026 – 2027|Trường A|Cô T|Cùng nhau', 'tên lớp, năm học và thông tin lớp lấy từ bản sao lưu');
select is((select term1_start::text from public.classes where id = (select id from newc)), '2026-09-05', 'ngày học kỳ giữ nguyên');
select is((select archived_at from public.classes where id = (select id from newc)), null, 'lớp mới không bị lưu trữ');
select isnt((select archived_at from public.classes where id = pg_temp.u('c1')), null, 'lớp cũ có archived_at');
select is((select class_id from public.profiles where id = pg_temp.u('d1')), (select id from newc), 'giáo viên chuyển sang lớp mới');
select is((select class_id from public.profiles where id = pg_temp.u('d3')), pg_temp.u('c1'), 'tài khoản học sinh ở lại lớp cũ');
select is((select label from public.avatar_library where id = (select avatar_id from public.profiles where id = pg_temp.u('d1'))), 'preset 1', 'avatar của giáo viên chuyển theo bản sao ở lớp mới');
-- So với bản sao lưu (lớp cũ đã nhận thêm dòng release khi đóng lớp nên không so trực tiếp được).
select is((select count(*)::int from bk_tables where jsonb_array_length((select j -> 'tables' -> t from bk)) <> pg_temp.cnt(t, (select id from newc))), 0, 'mọi bảng có cùng số dòng với bản sao lưu');
select is((select count(*)::int from bk_tables where pg_temp.overlap(t, pg_temp.u('c1'), (select id from newc)) <> 0), 0, 'mọi id đều là id mới');
select is((select count(*)::int from (select * from bal_before except
  select s.code, coalesce(sum(t.delta), 0)::bigint, coalesce(sum(t.delta) filter (where t.kind in ('award', 'penalty', 'reversal')), 0)::bigint
    from public.students s left join public.star_transactions t on t.class_id = s.class_id and t.student_id = s.id
   where s.class_id = (select id from newc) group by s.code) x), 0, 'sao thi đua và khả dụng của từng học sinh (theo code) khớp');
select is((select count(*)::int from (select s.code from public.students s where s.class_id = (select id from newc)) x), (select count(*)::int from bal_before), 'đủ học sinh theo code');
select is((select count(*)::int from public.students where class_id = (select id from newc) and archived_at is not null), 1, 'học sinh đã lưu trữ vẫn đã lưu trữ');
select is((select count(*)::int from public.profiles where class_id = (select id from newc) and role = 'student'), 0, 'lớp mới chưa có tài khoản học sinh');
select is((select count(*)::int from public.class_settings where class_id = (select id from newc)), 1, 'class_settings có đúng một dòng');
select is((select weekly_redeem_limit || '|' || timetable_saturday || '|' || star_steps::text || '|' || require_approval from public.class_settings where class_id = (select id from newc)),
          '7|true|{1,2}|false', 'cài đặt lớp được khôi phục');
select is((select count(*)::int from public.star_transactions r join public.star_transactions o on o.class_id = r.class_id and o.id = r.reverses_id
  where r.class_id = (select id from newc) and r.kind = 'reversal' and o.kind = 'penalty' and o.delta = -r.delta), 1, 'hoàn tác trỏ đúng dòng gốc của lớp mới');
select is((select count(*)::int from public.mission_completions c join public.star_transactions t on t.class_id = c.class_id and t.id = c.star_transaction_id
  where c.class_id = (select id from newc)), 1, 'nhiệm vụ hoàn thành trỏ đúng dòng sổ lớp mới');
select is((select count(*)::int from public.reward_requests where class_id = (select id from newc) and status = 'pending'), 1, 'yêu cầu đổi quà đang chờ được sao nguyên (không bị từ chối ở lớp mới)');
select is((select count(*)::int from public.star_transactions where class_id = (select id from newc) and kind = 'release'), 0, 'lớp mới không có dòng release');
select is((select count(*)::int from public.reward_requests where class_id = (select id from newc) and decided_by = pg_temp.u('d1')), 1, 'decided_by còn trong auth.users thì giữ');
select is((select (stock)::int from public.rewards where class_id = (select id from newc) and name = 'Bút'), 3, 'tồn kho quà giữ nguyên');
select is((select count(*)::int from public.timetable_slots where class_id = (select id from newc) and subject_id is not null), 1, 'tiết học trỏ đúng môn của lớp mới');
select is((select count(*)::int from public.group_members m join public.groups g on g.class_id = m.class_id and g.id = m.group_id where m.class_id = (select id from newc)), 2, 'thành viên tổ trỏ đúng tổ lớp mới');

-- đóng lớp cũ: từ chối yêu cầu đang chờ, trả sao đang giữ
select is((select count(*)::int from public.reward_requests where class_id = pg_temp.u('c1') and status = 'pending'), 0, 'lớp cũ: không còn yêu cầu pending');
select is((select status::text from public.reward_requests where id = pg_temp.u('31')), 'rejected', 'lớp cũ: yêu cầu pending bị từ chối');
select is((select count(*)::int from public.star_transactions where class_id = pg_temp.u('c1') and kind = 'release' and reward_request_id = pg_temp.u('31')), 1, 'lớp cũ: có dòng release trả sao');
select is((select sum(delta)::int from public.star_transactions where class_id = pg_temp.u('c1') and student_id = pg_temp.u('a1')), (select avail::int from bal_before where code = 'HS01') + 5, 'lớp cũ: sao đang giữ được trả lại');
select is((select count(*)::int from public.audit_logs where class_id = pg_temp.u('c1') and action = 'class_archived'), 1, 'lớp cũ: nhật ký class_archived');
select is((select count(*)::int from public.audit_logs where class_id = (select id from newc) and action = 'class_restored'), 1, 'lớp mới: nhật ký class_restored');
select throws_ok($$update public.star_transactions set note = 'x' where class_id = (select id from newc)$$, 'P0001', 'ledger_immutable', 'sổ sao vẫn chặn sửa');
select throws_ok($$delete from public.star_transactions where class_id = (select id from newc)$$, 'P0001', 'ledger_immutable', 'sổ sao vẫn chặn xóa');

select is((select count(*)::int from public.star_transactions where class_id = (select id from newc) and actor_id is not null and actor_id <> pg_temp.u('d1')), 0, 'actor_id khác giáo viên khôi phục bị đặt null');
select is((select count(*)::int from public.audit_logs where class_id = (select id from newc) and action = 'reward_created'), 0, 'khôi phục không ghi reward_created');
select is(private.close_class(pg_temp.u('c1')), 0, 'close_class trên lớp đã lưu trữ trả 0');
select is((select count(*)::int from public.audit_logs where class_id = pg_temp.u('c1') and action = 'class_archived'), 1, 'close_class lần hai không ghi nhật ký thêm');

-- đường dẫn ảnh
select is(j -> 'imagePaths' @> jsonb_build_array(jsonb_build_object('from', pg_temp.u('c1') || '/avatars/x.png', 'to', (select id from newc) || '/avatars/x.png')), true, 'imagePaths có ảnh avatar') from res;
select is(j -> 'imagePaths' @> jsonb_build_array(jsonb_build_object('from', pg_temp.u('c1') || '/rewards/r.png', 'to', (select id from newc) || '/rewards/r.png')), true, 'imagePaths có ảnh quà') from res;
select is(j -> 'imagePaths' @> jsonb_build_array(jsonb_build_object('from', pg_temp.u('c1') || '/announcements/n.png', 'to', (select id from newc) || '/announcements/n.png')), true, 'imagePaths có ảnh thông báo') from res;
select is(j -> 'imagePaths' @> jsonb_build_array(jsonb_build_object('from', pg_temp.u('c1') || '/branding/logo.png', 'to', (select id from newc) || '/branding/logo.png')), true, 'imagePaths có logo') from res;
select is((select jsonb_array_length(j -> 'imagePaths') from res), 4, 'imagePaths có đúng 4 ảnh');
select is((select image_path from public.avatar_library where class_id = (select id from newc) and kind = 'upload'), (select id from newc) || '/avatars/x.png', 'avatar: tiền tố đã đổi');
select is((select image_path from public.rewards where class_id = (select id from newc) and name = 'Bút'), (select id from newc) || '/rewards/r.png', 'quà: tiền tố đã đổi');
select is((select image_path from public.announcements where class_id = (select id from newc) and title = 'Họp phụ huynh'), (select id from newc) || '/announcements/n.png', 'thông báo: tiền tố đã đổi');
select is((select logo_path from public.classes where id = (select id from newc)), (select id from newc) || '/branding/logo.png', 'logo: tiền tố đã đổi');
select is((select image_path from public.announcements where class_id = (select id from newc) and title = 'Ảnh lạ'), null, 'đường dẫn có ".." bị bỏ (null)');
select is((select cover_path from public.classes where id = (select id from newc)), null, 'ảnh của lớp khác (tiền tố lạ) bị bỏ (null)');

-- ===== lưu trữ: danh sách và quyền sở hữu =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select is((select count(*)::int from public.my_archived_classes()), 1, 'giáo viên thấy 1 năm học đã lưu trữ');
select is((select id from public.my_archived_classes()), pg_temp.u('c1'), 'đúng lớp cũ');
select is((select class_name || '|' || school_year from public.my_archived_classes()), '5A|2026 – 2027', 'trả tên lớp và năm học');
select isnt((select archived_at from public.my_archived_classes()), null, 'trả archived_at');
select lives_ok($$select public.export_class_backup('00000000-0000-0000-0000-0000000000c1')$$, 'chủ sở hữu xuất được lớp đã lưu trữ');
select set_config('app.bk2', public.export_class_backup((select id from newc))::text, true);
select pg_temp.as_user(pg_temp.u('d2'));
select is((select count(*)::int from public.my_archived_classes()), 0, 'giáo viên khác không thấy lớp lưu trữ của người khác');
select throws_ok($$select public.export_class_backup('00000000-0000-0000-0000-0000000000c1')$$, 'P0001', 'not_allowed', 'giáo viên khác không xuất được lớp đã lưu trữ');
reset role;

-- xuất lại lớp mới ra cùng số dòng (khứ hồi)
select is((select count(*)::int from bk, jsonb_each(bk.j -> 'tables') a
            join jsonb_each(current_setting('app.bk2')::jsonb -> 'tables') b on b.key = a.key
           where jsonb_array_length(a.value) <> jsonb_array_length(b.value)), 0, 'xuất lại lớp mới có cùng số dòng từng bảng');

-- ===== người dùng cũ không còn: actor_id/decided_by/awarded_by đặt null =====
create temp table bk3 as
  select jsonb_set(jsonb_set(jsonb_set(j,
    '{tables,star_transactions}', (select jsonb_agg(e || jsonb_build_object('actor_id', gen_random_uuid())) from jsonb_array_elements(j #> '{tables,star_transactions}') e)),
    '{tables,reward_requests}', (select jsonb_agg(e || jsonb_build_object('decided_by', gen_random_uuid())) from jsonb_array_elements(j #> '{tables,reward_requests}') e)),
    '{tables,student_badges}', (select jsonb_agg(e || jsonb_build_object('awarded_by', gen_random_uuid())) from jsonb_array_elements(j #> '{tables,student_badges}') e)) as j
  from bk;
grant select on bk3 to public;
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select set_config('app.res3', public.restore_class_backup((select j from bk3))::text, true);
reset role;
select is((select count(*)::int from public.star_transactions where class_id = (current_setting('app.res3')::jsonb ->> 'classId')::uuid and actor_id is not null), 0, 'actor_id không còn trong auth.users -> null');
select is((select count(*)::int from public.star_transactions where class_id = (current_setting('app.res3')::jsonb ->> 'classId')::uuid), 7, 'vẫn đủ 7 dòng sổ');
select is((select count(*)::int from public.reward_requests where class_id = (current_setting('app.res3')::jsonb ->> 'classId')::uuid and decided_by is not null), 0, 'decided_by không còn -> null');
select is((select count(*)::int from public.student_badges where class_id = (current_setting('app.res3')::jsonb ->> 'classId')::uuid and awarded_by is not null), 0, 'awarded_by không còn -> null');
select is((select class_id from public.profiles where id = pg_temp.u('d1')), (current_setting('app.res3')::jsonb ->> 'classId')::uuid, 'giáo viên chuyển tiếp sang lớp mới nhất');
select is((select count(*)::int from public.classes where owner_id = pg_temp.u('d1') and archived_at is not null), 2, 'lớp liền trước cũng được lưu trữ (2 lớp đã lưu trữ)');

-- ===== cột thiếu lấy mặc định; bất biến sổ sao và kho =====
create temp table bk4 as
  select jsonb_set(jsonb_set(j, '{tables,students}', (select jsonb_agg(e - 'is_demo') from jsonb_array_elements(j #> '{tables,students}') e)),
                   '{tables,rewards}', (select jsonb_agg(e - 'is_demo' - 'hidden') from jsonb_array_elements(j #> '{tables,rewards}') e)) as j
    from bk;
grant select on bk4 to public;
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select lives_ok($$select set_config('app.res4', public.restore_class_backup((select j from bk4))::text, true)$$, 'dòng thiếu is_demo vẫn khôi phục được');
reset role;
select is((select count(*)::int from public.students where class_id = (current_setting('app.res4')::jsonb ->> 'classId')::uuid and is_demo = false), 3, 'cột thiếu lấy mặc định (is_demo false)');
create temp table bk5 as
  select jsonb_set(j, '{tables,star_transactions}', (select jsonb_agg(case when e ->> 'id' = pg_temp.u('45')::text then e || '{"delta": -1000}' else e end)
         from jsonb_array_elements(j #> '{tables,star_transactions}') e)) as j from bk;
create temp table bk6 as
  select jsonb_set(j, '{tables,rewards}', (select jsonb_agg(case when e ->> 'id' = pg_temp.u('21')::text then e || '{"stock": 0}' else e end)
         from jsonb_array_elements(j #> '{tables,rewards}') e)) as j from bk;
grant select on bk5, bk6 to public;
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select throws_ok($$select public.restore_class_backup((select j from bk5))$$, 'P0001', 'invalid_backup', 'số dư sao -1000 -> invalid_backup');
select throws_ok($$select public.restore_class_backup((select j from bk6))$$, 'P0001', 'invalid_backup', 'yêu cầu pending vượt tồn kho -> invalid_backup');
select throws_ok($$select public.restore_class_backup((select j from bk), '00000000-0000-0000-0000-0000000000c1')$$, 'P0001', 'stale_class', 'khôi phục với lớp đã cũ (form trỏ lớp khác lớp hiện tại): stale_class');
select lives_ok($$select public.restore_class_backup((select j from bk), (select class_id from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'))$$, 'khôi phục với đúng lớp hiện tại: chạy được');
reset role;

select * from finish();
rollback;
