#!/usr/bin/env bash
# Chạy tay: kiểm tra tranh chấp của hàm đổi quà trên DB local (cần `pnpm supabase start` và `pnpm seed:dev`).
#
# Mỗi kịch bản dùng ba phiên psql:
#   - phiên cổng (gate): begin; giữ một khóa hàng; chờ đến khi cả hai phiên RPC đều đang chờ khóa; rollback;
#   - hai phiên RPC: begin; gọi hàm (đóng vai authenticated); commit.
# Phiên RPC phải commit: nếu rollback thì phiên đến sau không thấy kết quả của phiên trước và không kiểm được tranh chấp.
# Vì vậy dữ liệu thử (quà RACE-*, dòng sổ ghi chú 'race-test', yêu cầu, audit) được dọn sau mỗi kịch bản
# bằng một giao dịch riêng (tắt trigger sổ tạm thời). Học sinh và giáo viên lấy bằng SQL, không ghi cứng id.
set -u
C="${SUPABASE_DB_CONTAINER:-supabase_db_MaiKhanh-WebQua_nLy}"
TMP="$(mktemp -d)"
PASS=0
FAIL=0

pg() { docker exec -i "$C" psql -U postgres -d postgres -qtAX -v ON_ERROR_STOP=1 "$@"; }
q() { pg -c "$1"; }

TEACHER=$(q "select id from public.profiles where role = 'teacher' order by username limit 1")
CLASS=$(q "select class_id from public.profiles where id = '$TEACHER'")
S1=$(q "select student_id from public.profiles where role = 'student' and class_id = '$CLASS' order by username limit 1")
S2=$(q "select student_id from public.profiles where role = 'student' and class_id = '$CLASS' order by username limit 1 offset 1")
U1=$(q "select id from public.profiles where student_id = '$S1'")
U2=$(q "select id from public.profiles where student_id = '$S2'")
if [ -z "$TEACHER" ] || [ -z "$S1" ] || [ -z "$S2" ]; then echo "Thiếu giáo viên hoặc hai học sinh trong seed (chạy pnpm seed:dev)"; exit 2; fi
START=$(q "select clock_timestamp()")

cleanup() {
  pg <<SQL
begin;
alter table public.star_transactions disable trigger star_transactions_immutable;
delete from public.star_transactions
 where note = 'race-test'
    or reward_request_id in (select rr.id from public.reward_requests rr join public.rewards w on w.id = rr.reward_id where w.name like 'RACE-%');
alter table public.star_transactions enable trigger star_transactions_immutable;
delete from public.reward_requests where reward_id in (select id from public.rewards where name like 'RACE-%');
delete from public.rewards where name like 'RACE-%';
delete from public.audit_logs where created_at >= '$START' and (action like 'rewards.%' or action = 'stars.penalize');
commit;
SQL
}
trap 'cleanup; rm -rf "$TMP"' EXIT

claims() { echo "select set_config('request.jwt.claims', json_build_object('sub', '$1', 'role', 'authenticated')::text, true);"; }

# rpc_session <tag> <user-id> <statement>  -> in ra "RESULT <tag> ok|<mã lỗi>"
rpc_session() {
  local tag="$1" user="$2" stmt="$3"
  pg 2>&1 <<SQL | grep -E "RESULT|deadlock|ERROR" > "$TMP/$tag.out"
set client_min_messages = notice;
begin;
set local role authenticated;
$(claims "$user")
do \$\$ begin /*race-$tag*/ perform $stmt; raise notice 'RESULT $tag ok'; exception when others then raise notice 'RESULT $tag %', sqlerrm; end \$\$;
commit;
SQL
}

# race <scenario> <gate-sql> <tagA> <userA> <stmtA> <tagB> <userB> <stmtB>
race() {
  local sc="$1" gate="$2"
  rm -f "$TMP"/*.out
  pg >"$TMP/gate.out" 2>&1 <<SQL &
begin;
$gate
do \$\$ begin /*gate-wait-$sc*/
  for i in 1..300 loop
    exit when (select count(*) from pg_stat_activity where pid <> pg_backend_pid() and wait_event_type = 'Lock' and query like '%race-$sc%') >= 2;
    perform pg_sleep(0.05);
  end loop;
end \$\$;
rollback;
SQL
  local gate_pid=$!
  for i in $(seq 1 100); do
    n=$(q "select count(*) from pg_stat_activity where pid <> pg_backend_pid() and state = 'active' and query like '%gate-wait-$sc%'")
    [ "$n" -ge 1 ] && break
    sleep 0.1
  done
  rpc_session "$sc-A" "$4" "$5" & local pa=$!
  rpc_session "$sc-B" "$7" "$8" & local pb=$!
  wait $pa $pb $gate_pid
  RA=$(grep RESULT "$TMP/$sc-A.out" | sed 's/.*RESULT [^ ]* //')
  RB=$(grep RESULT "$TMP/$sc-B.out" | sed 's/.*RESULT [^ ]* //')
  echo "  phiên A (${3:-$sc-A}): ${RA:-<không có kết quả>}"
  echo "  phiên B (${6:-$sc-B}): ${RB:-<không có kết quả>}"
}

check() { # check <mô tả> <điều kiện đúng = 0>
  if [ "$2" = "0" ]; then echo "  PASS: $1"; PASS=$((PASS + 1)); else echo "  FAIL: $1"; FAIL=$((FAIL + 1)); fi
}
has_deadlock() { if grep -qi deadlock "$TMP"/*.out 2>/dev/null; then echo 1; else echo 0; fi; }

echo "== (a) hai học sinh cùng xin món quà cuối cùng (stock 1)"
cleanup
RA_ID=$(q "insert into public.rewards (class_id, name, cost, stock) values ('$CLASS', 'RACE-A', 5, 1) returning id")
q "insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) select '$CLASS', s, 20, 'award', 'race-test', gen_random_uuid() from unnest(array['$S1', '$S2']::uuid[]) s"
race a "select 1 from public.rewards where id = '$RA_ID' for update;" A "$U1" "public.request_reward('$RA_ID')" B "$U2" "public.request_reward('$RA_ID')"
oks=0; [ "$RA" = ok ] && oks=$((oks + 1)); [ "$RB" = ok ] && oks=$((oks + 1))
check "đúng một yêu cầu thành công" $([ $oks -eq 1 ] && echo 0 || echo 1)
check "yêu cầu còn lại báo out_of_stock" $([ "$RA$RB" = "okout_of_stock" ] || [ "$RA$RB" = "out_of_stockok" ] && echo 0 || echo 1)
check "chỉ có 1 yêu cầu pending trong DB" $([ "$(q "select count(*) from public.reward_requests where reward_id = '$RA_ID'")" = 1 ] && echo 0 || echo 1)
check "không deadlock" $(has_deadlock)

echo "== (b) request_reward của A1 đua với penalize_stars khi số dư vừa đủ"
cleanup
RB_ID=$(q "insert into public.rewards (class_id, name, cost, stock) values ('$CLASS', 'RACE-B', 10, 5) returning id")
q "insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values ('$CLASS', '$S1', 10, 'award', 'race-test', gen_random_uuid())"
race b "select 1 from public.students where id = '$S1' for no key update;" request "$U1" "public.request_reward('$RB_ID')" penalize "$TEACHER" "public.penalize_stars(array['$S1']::uuid[], 10, null, 'race-test')"
oks=0; [ "$RA" = ok ] && oks=$((oks + 1)); [ "$RB" = ok ] && oks=$((oks + 1))
BAL=$(q "select coalesce(sum(delta), 0) from public.star_transactions where student_id = '$S1'")
echo "  số dư cuối: $BAL"
check "đúng một bên thành công" $([ $oks -eq 1 ] && echo 0 || echo 1)
check "bên còn lại báo insufficient_stars" $([ "$RA$RB" = "okinsufficient_stars" ] || [ "$RA$RB" = "insufficient_starsok" ] && echo 0 || echo 1)
check "số dư không âm" $([ "$BAL" -ge 0 ] && echo 0 || echo 1)
check "không deadlock" $(has_deadlock)

echo "== (c) approve và reject cùng một yêu cầu"
cleanup
RC_ID=$(q "insert into public.rewards (class_id, name, cost, stock) values ('$CLASS', 'RACE-C', 10, 1) returning id")
REQ=$(q "insert into public.reward_requests (class_id, student_id, reward_id, cost) values ('$CLASS', '$S1', '$RC_ID', 10) returning id")
q "insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values ('$CLASS', '$S1', 10, 'award', 'race-test', gen_random_uuid())"
q "insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id) values ('$CLASS', '$S1', -10, 'reserve', '$REQ')"
race c "select 1 from public.students where id = '$S1' for no key update;" approve "$TEACHER" "public.approve_reward_request('$REQ')" reject "$TEACHER" "public.reject_reward_request('$REQ')"
oks=0; [ "$RA" = ok ] && oks=$((oks + 1)); [ "$RB" = ok ] && oks=$((oks + 1))
ST=$(q "select status from public.reward_requests where id = '$REQ'")
BAL=$(q "select coalesce(sum(delta), 0) from public.star_transactions where student_id = '$S1'")
echo "  trạng thái cuối: $ST, số dư cuối: $BAL"
check "đúng một bên thành công" $([ $oks -eq 1 ] && echo 0 || echo 1)
check "bên còn lại báo already_processed" $([ "$RA$RB" = "okalready_processed" ] || [ "$RA$RB" = "already_processedok" ] && echo 0 || echo 1)
check "trạng thái khớp sổ (approved: số dư 0; rejected: số dư 10)" \
  $( { [ "$ST" = approved ] && [ "$BAL" = 0 ]; } || { [ "$ST" = rejected ] && [ "$BAL" = 10 ]; } && echo 0 || echo 1)
check "không deadlock" $(has_deadlock)

echo
echo "Kết quả: $PASS đạt, $FAIL lỗi"
[ "$FAIL" -eq 0 ]
