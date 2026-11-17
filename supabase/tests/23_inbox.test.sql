-- Hộp thư giáo viên: bảng conversations/messages, RLS chỉ đọc, RPC gửi/đọc/đếm, cờ, lưu trữ,
-- dọn theo học sinh (xóa học sinh, xóa demo), sao lưu/khôi phục, năm học mới.
begin;
select plan(103);

create function pg_temp.u(h text) returns uuid language sql immutable
as $$ select ('00000000-0000-0000-0000-' || lpad(h, 12, '0'))::uuid $$;
grant execute on function pg_temp.u(text) to public;
create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;

-- ===== dữ liệu mẫu =====
-- c1: lớp chính (giáo viên d1; học sinh a1 d3, a2 d4, a3 lưu trữ d5, a5 chưa có tài khoản). c2: lớp khác (d2, b1 d6).
-- c3: lớp để thử xóa học sinh, xóa demo, năm học mới (giáo viên d7; a7 xóa, a8 demo, a9 giữ).
insert into auth.users (id, email) values
  (pg_temp.u('d1'), 't1@test.local'), (pg_temp.u('d2'), 't2@test.local'), (pg_temp.u('d3'), 's1@test.local'),
  (pg_temp.u('d4'), 's2@test.local'), (pg_temp.u('d5'), 's3@test.local'), (pg_temp.u('d6'), 'sb@test.local'),
  (pg_temp.u('d7'), 't3@test.local');
insert into public.classes (id, class_name, school_year, owner_id) values
  (pg_temp.u('c1'), '5A', '2026 – 2027', pg_temp.u('d1')),
  (pg_temp.u('c2'), '5B', '2026 – 2027', pg_temp.u('d2')),
  (pg_temp.u('c3'), '5C', '2026 – 2027', pg_temp.u('d7'));
insert into public.students (id, class_id, code, roll_no, full_name, archived_at, is_demo) values
  (pg_temp.u('a1'), pg_temp.u('c1'), 'HS01', 1, 'A1', null, false),
  (pg_temp.u('a2'), pg_temp.u('c1'), 'HS02', 2, 'A2', null, false),
  (pg_temp.u('a3'), pg_temp.u('c1'), 'HS03', 3, 'A3 lưu trữ', now(), false),
  (pg_temp.u('a5'), pg_temp.u('c1'), 'HS05', 5, 'A5', null, false),
  (pg_temp.u('b1'), pg_temp.u('c2'), 'HS01', 1, 'B1', null, false),
  (pg_temp.u('a7'), pg_temp.u('c3'), 'HS07', 1, 'A7', null, false),
  (pg_temp.u('a8'), pg_temp.u('c3'), 'HS08', 2, 'A8 demo', null, true),
  (pg_temp.u('a9'), pg_temp.u('c3'), 'HS09', 3, 'A9', null, false);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  (pg_temp.u('d1'), pg_temp.u('c1'), 'teacher', 'co.t1', 'Cô T1', null),
  (pg_temp.u('d2'), pg_temp.u('c2'), 'teacher', 'co.t2', 'Cô T2', null),
  (pg_temp.u('d3'), pg_temp.u('c1'), 'student', 'hs.a1', 'A1', pg_temp.u('a1')),
  (pg_temp.u('d4'), pg_temp.u('c1'), 'student', 'hs.a2', 'A2', pg_temp.u('a2')),
  (pg_temp.u('d5'), pg_temp.u('c1'), 'student', 'hs.a3', 'A3', pg_temp.u('a3')),
  (pg_temp.u('d6'), pg_temp.u('c2'), 'student', 'hs.b1', 'B1', pg_temp.u('b1')),
  (pg_temp.u('d7'), pg_temp.u('c3'), 'teacher', 'co.t3', 'Cô T3', null);
-- Hội thoại có sẵn cho học sinh đã lưu trữ và cho lớp c3.
insert into public.conversations (id, class_id, student_id, last_sender_role) values
  (pg_temp.u('e3'), pg_temp.u('c1'), pg_temp.u('a3'), 'student'),
  (pg_temp.u('f7'), pg_temp.u('c3'), pg_temp.u('a7'), 'student'),
  (pg_temp.u('f8'), pg_temp.u('c3'), pg_temp.u('a8'), 'student'),
  (pg_temp.u('f9'), pg_temp.u('c3'), pg_temp.u('a9'), 'student');
insert into public.messages (class_id, conversation_id, sender_role, body, client_id) values
  (pg_temp.u('c1'), pg_temp.u('e3'), 'student', 'Tin cũ của em đã lưu trữ', pg_temp.u('01')),
  (pg_temp.u('c3'), pg_temp.u('f7'), 'student', 'a7', pg_temp.u('02')),
  (pg_temp.u('c3'), pg_temp.u('f8'), 'student', 'a8', pg_temp.u('03')),
  (pg_temp.u('c3'), pg_temp.u('f9'), 'student', 'a9', pg_temp.u('04'));

-- ===== quyền và cấu hình =====
select ok(has_function_privilege('authenticated', 'public.send_message(text, uuid, uuid)', 'execute'), 'authenticated gọi được send_message');
select ok(not has_function_privilege('anon', 'public.send_message(text, uuid, uuid)', 'execute'), 'anon không gọi được send_message');
select ok(not has_function_privilege('public', 'public.send_message(text, uuid, uuid)', 'execute'), 'PUBLIC không gọi được send_message');
select ok(has_function_privilege('authenticated', 'public.mark_conversation_read(uuid)', 'execute'), 'authenticated gọi được mark_conversation_read');
select ok(not has_function_privilege('anon', 'public.mark_conversation_read(uuid)', 'execute'), 'anon không gọi được mark_conversation_read');
select ok(has_function_privilege('authenticated', 'public.inbox_unread_count()', 'execute'), 'authenticated gọi được inbox_unread_count');
select ok(not has_function_privilege('anon', 'public.inbox_unread_count()', 'execute'), 'anon không gọi được inbox_unread_count');
select ok(not has_table_privilege('authenticated', 'public.messages', 'insert,update,delete'), 'authenticated không ghi trực tiếp messages');
select ok(not has_table_privilege('authenticated', 'public.conversations', 'insert,update,delete'), 'authenticated không ghi trực tiếp conversations');
select ok(not has_table_privilege('anon', 'public.messages', 'select'), 'anon không đọc messages');
select is((select count(*)::int from pg_class where oid in ('public.messages'::regclass, 'public.conversations'::regclass) and relrowsecurity), 2, 'RLS bật trên cả hai bảng');
select is((select student_can_message from public.class_settings where class_id = pg_temp.u('c1')), true, 'cờ student_can_message mặc định bật');
select ok((select count(*) = 2 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('conversations', 'messages')), 'conversations và messages nằm trong publication realtime');
select ok(private.backup_tables() @> array['conversations', 'messages'] and array_position(private.backup_tables(), 'conversations') < array_position(private.backup_tables(), 'messages'), 'backup_tables có conversations trước messages');

-- ===== học sinh A1 gửi tin =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d3'));
select is((public.send_message('  Em chào cô  ', pg_temp.u('a101'))).body, 'Em chào cô', 'học sinh gửi tin (bỏ khoảng trắng hai đầu)');
select is((public.send_message('Em chào cô', pg_temp.u('a101'))).id, (select id from public.messages where client_id = pg_temp.u('a101')), 'gửi lại cùng client_id trả về dòng cũ');
select is((select count(*)::int from public.messages where client_id = pg_temp.u('a101')), 1, 'gửi lại cùng client_id vẫn chỉ 1 dòng');
select is((public.send_message('Em chào cô', pg_temp.u('a101'))).sender_role::text, 'student', 'sender_role là student');
select is((select count(*)::int from public.messages), 1, 'học sinh thấy tin của mình');
select is((select count(*)::int from public.conversations), 1, 'học sinh thấy hội thoại của mình');
select is(public.inbox_unread_count(), 0, 'học sinh không có tin chưa đọc từ cô');
select throws_ok($$select public.send_message('   ', gen_random_uuid())$$, 'P0001', 'message_invalid', 'tin rỗng bị chặn');
select throws_ok($$select public.send_message(repeat('x', 2001), gen_random_uuid())$$, 'P0001', 'message_invalid', 'tin 2001 ký tự bị chặn');
select throws_ok($$select public.send_message('x', null)$$, 'P0001', 'message_invalid', 'thiếu client_id bị chặn');
select lives_ok($$select public.send_message(repeat('x', 2000), '00000000-0000-0000-0000-00000000a102')$$, 'tin đúng 2000 ký tự được gửi');
select lives_ok($$select public.send_message('3', '00000000-0000-0000-0000-00000000a103')$$, 'tin thứ 3');
select lives_ok($$select public.send_message('4', '00000000-0000-0000-0000-00000000a104')$$, 'tin thứ 4');
select lives_ok($$select public.send_message('5', '00000000-0000-0000-0000-00000000a105')$$, 'tin thứ 5');
select throws_ok($$select public.send_message('6', '00000000-0000-0000-0000-00000000a106')$$, 'P0001', 'rate_limited', 'tin thứ 6 trong 30 giây bị chặn');
select lives_ok($$select public.send_message('Em chào cô', '00000000-0000-0000-0000-00000000a101')$$, 'gửi lại tin cũ khi bị giới hạn vẫn trả về dòng cũ');
-- Ghi trực tiếp đều bị từ chối.
select throws_ok($$insert into public.messages (class_id, conversation_id, sender_role, body, client_id)
  select class_id, id, 'student', 'lén', gen_random_uuid() from public.conversations$$, '42501', null, 'học sinh không insert trực tiếp messages');
select throws_ok($$update public.messages set body = 'sửa'$$, '42501', null, 'học sinh không update trực tiếp messages');
select throws_ok($$delete from public.messages$$, '42501', null, 'học sinh không delete trực tiếp messages');
select throws_ok($$insert into public.conversations (class_id, student_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2')$$, '42501', null, 'học sinh không insert trực tiếp conversations');
reset role;
select is((select last_sender_role::text from public.conversations where student_id = pg_temp.u('a1')), 'student', 'last_sender_role = student sau khi học sinh gửi');
select is((select count(*)::int from public.messages where conversation_id = (select id from public.conversations where student_id = pg_temp.u('a1'))), 5, 'hội thoại của A1 có 5 tin');

-- ===== người khác không thấy và không đụng được =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d4'));
select is((select count(*)::int from public.messages), 0, 'học sinh B (cùng lớp) không thấy tin của A');
select is((select count(*)::int from public.conversations), 0, 'học sinh B không thấy hội thoại của A');
select throws_ok($$select public.mark_conversation_read((select id from (select id from public.conversations union all select c.id from public.conversations c) x limit 1))$$, 'P0001', 'conversation_not_found', 'học sinh B không đánh dấu đọc hội thoại của A (không thấy gì)');
select throws_ok($$select public.mark_conversation_read('00000000-0000-0000-0000-0000000000a9')$$, 'P0001', 'conversation_not_found', 'id hội thoại lạ: conversation_not_found');
select pg_temp.as_user(pg_temp.u('d2'));
select is((select count(*)::int from public.messages), 0, 'giáo viên lớp khác không thấy tin');
select is((select count(*)::int from public.conversations), 0, 'giáo viên lớp khác không thấy hội thoại');
select throws_ok($$select public.send_message('x', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1')$$, 'P0001', 'student_not_found', 'giáo viên lớp khác không gửi được cho học sinh của A');
reset role;
create temp table conv1 as select id from public.conversations where student_id = pg_temp.u('a1');
grant select on conv1 to public;
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d2'));
select throws_ok($$select public.mark_conversation_read((select id from conv1))$$, 'P0001', 'conversation_not_found', 'giáo viên lớp khác không đánh dấu đọc được');
select is(public.inbox_unread_count(), 0, 'giáo viên lớp khác: 0 tin chưa đọc');
select pg_temp.as_user(pg_temp.u('d4'));
select throws_ok($$select public.mark_conversation_read((select id from conv1))$$, 'P0001', 'conversation_not_found', 'học sinh B không đánh dấu đọc hội thoại của A');
-- Học sinh bỏ qua p_student_id: tin vào hội thoại của chính mình.
select lives_ok($$select public.send_message('Em A2 đây', '00000000-0000-0000-0000-00000000b201', '00000000-0000-0000-0000-0000000000a1')$$, 'học sinh B truyền p_student_id của A vẫn gửi được');
reset role;
select is((select c.student_id from public.messages m join public.conversations c on c.id = m.conversation_id where m.client_id = pg_temp.u('b201')), pg_temp.u('a2'), 'tin của học sinh B vào hội thoại của B, không vào của A');

-- ===== giáo viên lớp c1 =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select is((select count(*)::int from public.messages), 7, 'giáo viên thấy mọi tin của lớp (6 của A1 và A2 + 1 của học sinh lưu trữ)');
select is((select count(*)::int from public.conversations), 3, 'giáo viên thấy 3 hội thoại của lớp');
select is(public.inbox_unread_count(), 7, 'giáo viên có 7 tin chưa đọc');
select is((public.send_message('Cô chào em', pg_temp.u('c101'), pg_temp.u('a1'))).sender_role::text, 'teacher', 'giáo viên trả lời học sinh A1');
select throws_ok($$select public.send_message('x', gen_random_uuid())$$, 'P0001', 'student_not_found', 'giáo viên phải truyền p_student_id');
select throws_ok($$select public.send_message('x', gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1')$$, 'P0001', 'student_not_found', 'giáo viên không gửi cho học sinh lớp khác');
select throws_ok($$select public.send_message('x', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a3')$$, 'P0001', 'student_not_found', 'giáo viên không gửi cho học sinh đã lưu trữ');
select lives_ok($$select public.send_message('Cô hỏi thăm em', '00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-0000000000a5')$$, 'giáo viên chủ động mở hội thoại với học sinh chưa nhắn');
select throws_ok($$insert into public.messages (class_id, conversation_id, sender_role, body, client_id)
  select class_id, id, 'teacher', 'lén', gen_random_uuid() from public.conversations limit 1$$, '42501', null, 'giáo viên không insert trực tiếp messages');
select throws_ok($$update public.messages set read_at = null$$, '42501', null, 'giáo viên không update trực tiếp messages');
select throws_ok($$delete from public.conversations$$, '42501', null, 'giáo viên không delete trực tiếp conversations');
reset role;
select is((select last_sender_role::text from public.conversations where student_id = pg_temp.u('a1')), 'teacher', 'last_sender_role = teacher sau khi cô trả lời');

-- ===== đánh dấu đã đọc: chỉ tin của bên kia =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d3'));
select is(public.inbox_unread_count(), 1, 'học sinh A1 có 1 tin chưa đọc từ cô');
select is(public.mark_conversation_read((select id from conv1)), 1, 'học sinh đánh dấu đọc đúng 1 tin của cô');
select is(public.inbox_unread_count(), 0, 'số chưa đọc của học sinh về 0');
select pg_temp.as_user(pg_temp.u('d1'));
select is(public.inbox_unread_count(), 7, 'học sinh đánh dấu không làm đổi số chưa đọc của giáo viên');
select is(public.mark_conversation_read((select id from conv1)), 5, 'giáo viên đánh dấu đọc 5 tin của A1');
select is(public.inbox_unread_count(), 2, 'số chưa đọc của giáo viên giảm từ 7 còn 2');
select is(public.mark_conversation_read((select id from conv1)), 0, 'đánh dấu lần hai không đổi gì');
reset role;
select is((select count(*)::int from public.messages where conversation_id = (select id from conv1) and sender_role = 'student' and read_at is null), 0, 'mọi tin của học sinh trong hội thoại A1 đã đọc');
select is((select count(*)::int from public.messages where conversation_id = (select id from conv1) and sender_role = 'teacher' and read_at is not null), 1, 'tin của cô đã đọc sau khi học sinh mở');
select is((select count(*)::int from public.messages where conversation_id <> (select id from conv1) and sender_role = 'student' and read_at is not null), 0, 'hội thoại khác không bị đánh dấu');

-- ===== tắt cờ student_can_message =====
update public.class_settings set student_can_message = false where class_id = pg_temp.u('c1');
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d3'));
select is((select count(*)::int from public.messages), 0, 'cờ tắt: học sinh không đọc được tin');
select is((select count(*)::int from public.conversations), 0, 'cờ tắt: học sinh không đọc được hội thoại');
select throws_ok($$select public.send_message('x', gen_random_uuid())$$, 'P0001', 'not_allowed', 'cờ tắt: học sinh không gửi được');
select throws_ok($$select public.mark_conversation_read((select id from conv1))$$, 'P0001', 'not_allowed', 'cờ tắt: học sinh không đánh dấu đọc được');
select is(public.inbox_unread_count(), 0, 'cờ tắt: số chưa đọc của học sinh là 0');
select pg_temp.as_user(pg_temp.u('d1'));
select is((select count(*)::int from public.conversations), 4, 'cờ tắt: giáo viên vẫn thấy hội thoại');
reset role;
update public.class_settings set student_can_message = true where class_id = pg_temp.u('c1');

-- ===== học sinh đã lưu trữ =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d5'));
select is((select count(*)::int from public.messages), 0, 'học sinh lưu trữ không đọc được tin');
select is((select count(*)::int from public.conversations), 0, 'học sinh lưu trữ không đọc được hội thoại');
select throws_ok($$select public.send_message('x', gen_random_uuid())$$, 'P0001', 'not_allowed', 'học sinh lưu trữ không gửi được');
select is(public.inbox_unread_count(), 0, 'học sinh lưu trữ: số chưa đọc là 0');
reset role;

-- ===== xóa học sinh, xóa demo =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d7'));
select is(public.inbox_unread_count(), 3, 'giáo viên c3 có 3 tin chưa đọc');
select lives_ok($$select public.delete_student('00000000-0000-0000-0000-0000000000a7')$$, 'delete_student chạy được khi học sinh có hội thoại');
reset role;
select is((select count(*)::int from public.conversations where student_id = pg_temp.u('a7')) + (select count(*)::int from public.messages where conversation_id = pg_temp.u('f7')), 0, 'delete_student dọn hội thoại và tin nhắn');
select is((select count(*)::int from public.conversations where class_id = pg_temp.u('c3')), 2, 'hội thoại học sinh khác trong lớp vẫn còn');
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d7'));
select lives_ok($$select public.delete_demo_data()$$, 'delete_demo_data chạy được khi học sinh demo có hội thoại');
reset role;
select is((select count(*)::int from public.conversations where student_id = pg_temp.u('a8')) + (select count(*)::int from public.messages where conversation_id = pg_temp.u('f8')), 0, 'xóa demo dọn hội thoại và tin nhắn của học sinh demo');
select is((select count(*)::int from public.messages where conversation_id = pg_temp.u('f9')), 1, 'xóa demo không đụng học sinh thật');

-- ===== năm học mới: hộp thư không sang lớp mới =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d7'));
select set_config('app.ny', public.start_new_school_year(jsonb_build_object(
  'expected_class_id', pg_temp.u('c3'), 'school_year', '2027 – 2028', 'class_name', '6C'))::text, true);
reset role;
select is((select count(*)::int from public.conversations where class_id = current_setting('app.ny')::uuid), 0, 'lớp năm học mới không có hội thoại');
select is((select count(*)::int from public.messages where class_id = pg_temp.u('c3')), 1, 'lớp năm cũ giữ nguyên tin nhắn (học sinh vẫn ở lớp đó)');

-- ===== sao lưu và khôi phục =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select set_config('app.bk', public.export_class_backup(pg_temp.u('c1'))::text, true);
reset role;
create temp table bk as select current_setting('app.bk')::jsonb as j;
grant select on bk to public;
select is((select jsonb_array_length(j #> '{tables,conversations}') from bk), 4, 'bản sao lưu có 4 hội thoại');
select is((select jsonb_array_length(j #> '{tables,messages}') from bk), 9, 'bản sao lưu có 9 tin nhắn');
select ok((select bool_or(e ->> 'sender_id' is not null) from bk, jsonb_array_elements(j #> '{tables,messages}') e), 'bản sao lưu ghi sender_id gốc');

-- Bản sao lưu cũ (thiếu hai khóa) vẫn khôi phục được.
create temp table bk_old as select j #- '{tables,conversations}' #- '{tables,messages}' as j from bk;
grant select on bk_old to public;
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select lives_ok($$select set_config('app.res_old', public.restore_class_backup((select j from bk_old))::text, true)$$, 'bản sao lưu cũ thiếu conversations/messages vẫn khôi phục được');
reset role;
select is((select count(*)::int from public.conversations where class_id = (current_setting('app.res_old')::jsonb ->> 'classId')::uuid), 0, 'khôi phục bản cũ: không có hội thoại');
select ok(private.backup_valid((select j from bk_old)), 'backup_valid nhận bản sao lưu cũ');
select ok(not private.backup_valid(jsonb_set((select j from bk), '{tables,messages}', '{}')), 'backup_valid từ chối messages không phải mảng');

-- Khôi phục bản đầy đủ (giáo viên đã chuyển sang lớp mới ở bước trên, vẫn khôi phục được).
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select set_config('app.res', public.restore_class_backup((select j from bk))::text, true);
reset role;
create temp table newc as select (current_setting('app.res')::jsonb ->> 'classId')::uuid as id;
grant select on newc to public;
select is((select count(*)::int from public.conversations where class_id = (select id from newc)), 4, 'khôi phục: đủ 4 hội thoại');
select is((select count(*)::int from public.messages where class_id = (select id from newc)), 9, 'khôi phục: đủ 9 tin nhắn');
select is((select count(*)::int from public.messages where class_id = (select id from newc) and sender_id is not null), 0, 'khôi phục: sender_id về null');
select is((select count(*)::int from public.messages where class_id = (select id from newc) and sender_role = 'teacher'), 2, 'khôi phục: giữ sender_role');
select is((select count(*)::int from public.messages m join public.conversations c on c.class_id = m.class_id and c.id = m.conversation_id
            join public.students s on s.class_id = c.class_id and s.id = c.student_id
           where m.class_id = (select id from newc)), 9, 'khôi phục: tin nhắn trỏ đúng hội thoại và học sinh của lớp mới');
select is((select count(*)::int from public.messages where class_id = (select id from newc) and id in (select id from public.messages where class_id = pg_temp.u('c1'))), 0, 'khôi phục: id tin nhắn đều là id mới');
select is((select count(*)::int from public.messages where class_id = (select id from newc) and read_at is not null),
          (select count(*)::int from public.messages where class_id = pg_temp.u('c1') and read_at is not null), 'khôi phục: giữ trạng thái đã đọc');

select * from finish();
rollback;
