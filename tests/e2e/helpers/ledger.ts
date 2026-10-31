import { execFileSync } from 'node:child_process'

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
    update public.students set archived_at = null where class_id = '${CLASS_ID}' and is_demo = true;
    delete from public.group_members where class_id = '${CLASS_ID}';
    delete from public.groups where class_id = '${CLASS_ID}' and id not in (${[1, 2, 3, 4].map((n) => `'${g(n)}'`).join(',')});
    insert into public.group_members (class_id, group_id, student_id, role, is_demo) values
    ${members.map(([gn, sn, role]) => `('${CLASS_ID}', '${g(gn)}', '${sid(sn)}', '${role}', true)`).join(',\n')};
    commit;
  `)
}
