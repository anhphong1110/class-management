import { execFileSync } from 'node:child_process'

export const CLASS_ID = '00000000-0000-0000-0000-000000000058'
export const sid = (n: number) => `00000000-0000-0000-0000-0000000b${String(n).padStart(4, '0')}`
const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_MaiKhanh-WebQua_nLy'

/** Sổ sao là append-only (trigger chặn DELETE), nên test tắt trigger trong một giao dịch để dọn. */
function sql(statement: string) {
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
