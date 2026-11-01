import { execFileSync } from 'node:child_process'
import { admin } from '../helpers'

export const CLASS_ID = '00000000-0000-0000-0000-000000000058'
export const sid = (n: number) => `00000000-0000-0000-0000-0000000b${String(n).padStart(4, '0')}`
const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_MaiKhanh-WebQua_nLy'

/**
 * LƯU Ý: các helper dưới đây dùng chung một lớp seed và xóa toàn bộ sổ sao của lớp,
 * nên chỉ an toàn khi Playwright chạy `workers: 1` (xem playwright.config.ts). Không chạy song song.
 */

/** Sổ sao là append-only (trigger chặn DELETE), nên test tắt trigger trong một giao dịch để dọn. */
export function sql(statement: string) {
  execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement], {
    stdio: 'pipe',
  })
}

export function resetStars() {
  sql(`
    begin;
    alter table public.star_transactions disable trigger star_transactions_immutable;
    delete from public.star_transactions where class_id = '${CLASS_ID}';
    alter table public.star_transactions enable trigger star_transactions_immutable;
    delete from public.star_criteria where class_id = '${CLASS_ID}' and label in ('Đọc sách', 'Đọc sách nhiều');
    update public.star_criteria set archived_at = null where class_id = '${CLASS_ID}';
    commit;
  `)
}

/** daysAgo > 0 đặt created_at lùi về quá khứ (trigger sổ được tắt tạm để chèn được mốc giờ tùy ý nếu cần). */
export function seedStars(studentNo: number, points: number, daysAgo = 0) {
  const at = daysAgo > 0 ? `now() - interval '${Math.floor(daysAgo)} days'` : 'now()'
  sql(`insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id, created_at)
       values ('${CLASS_ID}', '${sid(studentNo)}', ${points}, 'award', 'seed', gen_random_uuid(), ${at})`)
}

/** Chèn giao dịch với delta tùy ý (âm = trừ sao) và mốc `daysAgo` ngày trước. */
export function seedDelta(studentNo: number, delta: number, daysAgo = 0) {
  const at = daysAgo > 0 ? `now() - interval '${Math.floor(daysAgo)} days'` : 'now()'
  const kind = delta < 0 ? 'penalty' : 'award'
  sql(`insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id, created_at)
       values ('${CLASS_ID}', '${sid(studentNo)}', ${delta}, '${kind}', 'seed', gen_random_uuid(), ${at})`)
}

/** Xóa học sinh test (mã khác HS01–HS10 của seed) cùng sổ sao và điểm danh của họ. */
export function deleteTestStudents() {
  sql(`
    begin;
    alter table public.star_transactions disable trigger star_transactions_immutable;
    delete from public.star_transactions where student_id in (select id from public.students where class_id = '${CLASS_ID}' and is_demo = false);
    alter table public.star_transactions enable trigger star_transactions_immutable;
    delete from public.reward_requests where student_id in (select id from public.students where class_id = '${CLASS_ID}' and is_demo = false);
    delete from public.attendance where student_id in (select id from public.students where class_id = '${CLASS_ID}' and is_demo = false);
    delete from public.group_members where student_id in (select id from public.students where class_id = '${CLASS_ID}' and is_demo = false);
    delete from public.students where class_id = '${CLASS_ID}' and is_demo = false;
    commit;
  `)
}

export function resetAttendance() {
  sql(`delete from public.attendance where class_id = '${CLASS_ID}'`)
}

export function seedAttendance(studentNo: number, status: 'present' | 'late' | 'absent_excused' | 'absent_unexcused', daysAgo = 0) {
  const d = `(now() at time zone 'Asia/Ho_Chi_Minh')::date - ${Math.floor(daysAgo)}`
  sql(`insert into public.attendance (class_id, student_id, date, status) values ('${CLASS_ID}', '${sid(studentNo)}', ${d}, '${status}')`)
}

/** Khôi phục tổ như seed (xóa tổ thêm trong test, trả vai và thành viên, bỏ lưu trữ học sinh demo). */
export function resetGroups() {
  const g = (n: number) => `00000000-0000-0000-0000-0000000c${String(n).padStart(4, '0')}`
  const members: [number, number, string][] = [
    [1, 1, 'leader'], [1, 2, 'deputy'], [1, 3, 'member'],
    [2, 4, 'deputy'], [2, 5, 'leader'], [2, 6, 'member'],
    [3, 7, 'deputy'], [3, 8, 'leader'],
    [4, 9, 'deputy'], [4, 10, 'leader'],
  ]
  sql(`
    begin;
    select set_config('app.archive_student', 'on', true);
    update public.students set archived_at = null where class_id = '${CLASS_ID}' and is_demo = true;
    delete from public.group_members where class_id = '${CLASS_ID}';
    delete from public.groups where class_id = '${CLASS_ID}' and id not in (${[1, 2, 3, 4].map((n) => `'${g(n)}'`).join(',')});
    insert into public.group_members (class_id, group_id, student_id, role, is_demo) values
    ${members.map(([gn, sn, role]) => `('${CLASS_ID}', '${g(gn)}', '${sid(sn)}', '${role}', true)`).join(',\n')};
    commit;
  `)
}

const SEED_REWARDS: [string, string, number, string, string, number][] = [
  ['Sticker vũ trụ', 'Bộ sticker phi hành gia và hành tinh.', 10, 'star', 'e0001', 30],
  ['Bookmark tên lửa', 'Kẹp sách hình tên lửa nhỏ xinh.', 15, 'book', 'e0002', 20],
  ['Bút dễ thương', 'Bút gel hình ngôi sao, mực xanh tím.', 25, 'pen', 'e0003', 8],
  ['Huy hiệu phi hành gia', 'Huy hiệu kim loại cài áo đồng phục.', 30, 'badge', 'e0004', 12],
  ['Quà bí mật', 'Một bất ngờ do cô Khanh chuẩn bị.', 50, 'gift', 'e0005', 5],
]

/** Đưa trạng thái đổi quà của lớp về seed: yêu cầu, dòng sổ đổi quà, 5 quà mẫu, quà thêm và ảnh tải lên. */
export async function resetRewards() {
  const store = admin().storage.from('class-media')
  const { data } = await store.list(`${CLASS_ID}/rewards`)
  if (data?.length) await store.remove(data.map((f) => `${CLASS_ID}/rewards/${f.name}`))
  sql(`
    begin;
    alter table public.star_transactions disable trigger star_transactions_immutable;
    delete from public.star_transactions where class_id = '${CLASS_ID}' and reward_request_id is not null;
    alter table public.star_transactions enable trigger star_transactions_immutable;
    delete from public.reward_requests where class_id = '${CLASS_ID}';
    delete from public.rewards where class_id = '${CLASS_ID}' and is_demo = false;
    commit;
  `)
  for (const [name, description, cost, icon, id, stock] of SEED_REWARDS) {
    sql(`update public.rewards set stock = ${stock}, hidden = false, image_path = null, name = '${name}', description = '${description}', cost = ${cost}, icon = '${icon}' where id = '00000000-0000-0000-0000-0000000${id}'`)
  }
}

const SEED_SUBJECTS: [string, string][] = [
  ['Toán', '#2C37A8'], ['Tiếng Việt', '#8E1B3B'], ['Tiếng Anh', '#0B5A4D'], ['Khoa học', '#0F5E8F'],
  ['Lịch sử – Địa lý', '#6E4700'], ['Đạo đức', '#5E35B1'], ['Thể dục', '#7A3510'], ['Mĩ thuật', '#7E1D69'],
  ['Âm nhạc', '#4A33A8'], ['Tin học', '#2B6110'], ['HĐ trải nghiệm', '#3A3769'], ['Sinh hoạt lớp', '#3A3769'],
]

/** Xóa mọi tiết của lớp, bỏ môn thêm/đổi tên, khôi phục 12 môn seed (tên, màu, thứ tự). */
export function resetTimetable() {
  const names = SEED_SUBJECTS.map(([n]) => `'${n}'`).join(',')
  const values = SEED_SUBJECTS.map(([n, c], i) => `('${n}', '${c}', ${i + 1})`).join(',')
  sql(`
    begin;
    delete from public.timetable_slots where class_id = '${CLASS_ID}';
    delete from public.subjects where class_id = '${CLASS_ID}' and name not in (${names});
    update public.subjects s set color = v.color, sort_order = v.ord
      from (values ${values}) as v(name, color, ord) where s.class_id = '${CLASS_ID}' and s.name = v.name;
    insert into public.subjects (class_id, name, color, sort_order, is_demo)
      select '${CLASS_ID}', v.name, v.color, v.ord, true from (values ${values}) as v(name, color, ord)
      where not exists (select 1 from public.subjects s where s.class_id = '${CLASS_ID}' and s.name = v.name);
    update public.class_settings set timetable_saturday = false where class_id = '${CLASS_ID}';
    commit;
  `)
}

export function seedSlot(weekday: number, session: 'morning' | 'afternoon', period: number, subjectName: string) {
  sql(`insert into public.timetable_slots (class_id, weekday, session, period, subject_id)
       select '${CLASS_ID}', ${weekday}, '${session}', ${period}, id from public.subjects
       where class_id = '${CLASS_ID}' and name = '${subjectName}'`)
}

/** Xóa mọi thông báo của lớp và ảnh đính kèm đã tải lên. */
export async function resetAnnouncements() {
  const store = admin().storage.from('class-media')
  const { data } = await store.list(`${CLASS_ID}/announcements`)
  if (data?.length) await store.remove(data.map((f) => `${CLASS_ID}/announcements/${f.name}`))
  sql(`delete from public.announcements where class_id = '${CLASS_ID}'`)
}

const SEED_MISSIONS: [string, string, string, string, number, boolean][] = [
  ['d0001', 'Hoàn thành nhiệm vụ học tập', 'week', 'Làm đủ bài tập về nhà các ngày trong tuần.', 3, true],
  ['d0002', 'Đọc sách trong tuần', 'week', 'Đọc ít nhất 1 cuốn sách và kể lại cho cô nghe.', 2, true],
  ['d0003', 'Giúp đỡ bạn bè', 'month', 'Được cô ghi nhận giúp bạn ít nhất 3 lần.', 0, true],
  ['d0004', 'Giữ vệ sinh lớp', 'week', 'Tổ trực nhật hoàn thành đủ các buổi.', 2, true],
  ['d0005', 'Có tiến bộ', 'month', 'Điểm kiểm tra tăng so với tháng trước.', 5, false],
]

/** Xóa hoàn thành nhiệm vụ và huy hiệu đã trao, bỏ nhiệm vụ/huy hiệu thêm trong test, khôi phục seed và bật lại tính năng. */
export function resetMissions() {
  const ids = SEED_MISSIONS.map(([id]) => `'00000000-0000-0000-0000-0000000${id}'`).join(',')
  sql(`
    begin;
    delete from public.mission_completions where class_id = '${CLASS_ID}';
    delete from public.student_badges where class_id = '${CLASS_ID}';
    delete from public.missions where class_id = '${CLASS_ID}' and id not in (${ids});
    delete from public.badges where class_id = '${CLASS_ID}' and is_demo = false;
    ${SEED_MISSIONS.map(
      ([id, name, period, cond, stars, active]) =>
        `update public.missions set name = '${name}', period = '${period}', condition = '${cond}', reward_stars = ${stars}, active = ${active} where id = '00000000-0000-0000-0000-0000000${id}';`,
    ).join('\n    ')}
    update public.class_settings set feature_missions = true where class_id = '${CLASS_ID}';
    commit;
  `)
}
