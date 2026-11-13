# Màn chờ khi tải trang và đăng nhập: kế hoạch thực hiện

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng luôn thấy app đang tải, gồm ba thứ:
- màn tên lửa khi bấm đăng nhập;
- khung xương khi chuyển trang trong cùng khu;
- spinner trên link chuyển khu.

Trang học sinh bị cô tắt vẫn trả 404 thật.

**Architecture:**
- Khung xương: `loading.tsx` đặt bên trong layout từng khu (`(teacher)`, `em`). **Không** có `app/loading.tsx`.
- Giữ 404 cho khu học sinh:
  - middleware ghi đè header `x-pathname`;
  - `app/em/layout.tsx` gọi `notFound()` trước vùng chờ khi trang đang mở bị tắt.
- Màn tên lửa: lớp phủ client, portal vào `document.body`, hiện theo `pending` của `useActionState`.
- Spinner trên link: dùng `useLinkStatus()` của `next/link`.

**Tech Stack:** Next 15.5.28 (App Router), React 19.1, Tailwind 4, vitest + Testing Library (jsdom), Playwright e2e (chạy `pnpm dev` với Supabase local).

**Spec:** [docs/superpowers/specs/2026-11-13-loading-states-design.md](../specs/2026-11-13-loading-states-design.md)

## Global Constraints

- Không tạo `app/loading.tsx` và `app/(auth)/dang-nhap/loading.tsx`.
- File `.tsx` không thêm mã hex: `tests/unit/hex-guard.test.ts` phải đạt. Màu đặt trong file `.css`.
- Chữ hiển thị:
  - lớp phủ: `Đang chuẩn bị trạm…`;
  - nút vào nhanh khi đang chạy: `Đang bay…`;
  - chữ cho đọc màn hình trong link đang chuyển: `Đang tải…`.
- Lớp phủ hiện trễ 300ms. Spinner trên link hiện trễ 100ms.
- Giảm chuyển động (`prefers-reduced-motion: reduce`):
  - tắt hiệu ứng lơ lửng và quay;
  - lớp phủ và spinner **vẫn phải hiện**.
  - Cách bảo đảm: phần "hiện trễ" dùng `animation` có `from { opacity: 0 }` và `animation-fill-mode: both`. Phần tử mặc định vẫn có opacity 1, nên khi animation bị tắt nó hiện ngay.
- Giữ nguyên `requireStudentPage()` trong 7 trang `app/em/*/page.tsx`.
- Middleware phải giữ đúng các lần làm mới cookie phiên đang có.
- Branch: `feat/loading-states`, tách từ branch mà bạn chọn lúc bắt đầu làm (`main` hoặc `feat/kho-hoc-lieu`).
- E2E cần Supabase local đang chạy (`supabase start`), vì `.env.local` trỏ tới localhost.

## Review Focus

1. **Gõ sai mật khẩu:** lớp phủ phải tắt, lỗi hiện ra, form gõ lại được. Test e2e ở Task 3.
2. **Client tự gửi header `x-pathname` giả:** middleware phải ghi đè bằng đường dẫn thật, để không né được bước kiểm tra cờ. Unit test ở Task 1.
3. **Lớp phủ bị nút chat (`z-40`) hoặc stacking context `.sp > *` (`z-index: 1`) đè lên:** lớp phủ phải portal ra `body` và có `z-50`. Unit test ở Task 3.
4. **Đường dẫn học sinh lạ hoặc gần giống** (`/em/xep-hangx`, `/em/khong-co`, `/em/xep-hang/abc`): không được map nhầm sang trang khác. Unit test ở Task 1.
5. **Bật giảm chuyển động:** lớp phủ và spinner vẫn hiện. Bảo đảm bằng cách viết CSS theo Global Constraints, và kiểm bằng trình duyệt ở Task 5.

---

### Task 1: Map đường dẫn học sinh và header `x-pathname`

**Files:**
- Modify: `lib/auth/route-guard.ts` (thêm hằng)
- Modify: `lib/student/flags.ts` (thêm hàm)
- Modify: `lib/supabase/middleware.ts` (`updateSession`)
- Test: `tests/unit/student-flags.test.ts`, `tests/unit/pathname-header.test.ts` (mới)

**Interfaces:**
- Produces:
  - `export const PATHNAME_HEADER = 'x-pathname'` trong `lib/auth/route-guard.ts`;
  - `export function studentPageForPath(pathname: string): StudentPageId | null` trong `lib/student/flags.ts`.

- [ ] **Step 1: Viết test hỏng cho `studentPageForPath`.** Thêm vào `tests/unit/student-flags.test.ts`:

```ts
describe('studentPageForPath', () => {
  it.each([
    ['/em', 'home'], ['/em/sao', 'stars'], ['/em/xep-hang', 'rank'], ['/em/doi-qua', 'gifts'],
    ['/em/thoi-khoa-bieu', 'tt'], ['/em/diem-danh', 'att'], ['/em/thong-bao', 'news'],
    ['/em/kho-hoc-lieu', 'hub'], ['/em/xep-hang/abc', 'rank'],
  ])('%s → %s', (p, id) => expect(studentPageForPath(p)).toBe(id))
  it.each(['/em/xep-hangx', '/em/khong-co', '/tong-quan', '/emx', '/'])('%s → null', (p) =>
    expect(studentPageForPath(p)).toBeNull())
})
```

- [ ] **Step 2:** Chạy `pnpm vitest run tests/unit/student-flags.test.ts`. Kỳ vọng: FAIL vì `studentPageForPath` chưa có.
- [ ] **Step 3: Viết `studentPageForPath`.**
  - `/em` khớp chính xác thì trả `'home'`.
  - Với các mục khác trong `STUDENT_NAV` (bỏ `home`): khớp khi `pathname === href` hoặc `pathname.startsWith(href + '/')`.
  - Không khớp mục nào thì trả `null`.
- [ ] **Step 4:** Chạy lại lệnh ở Step 2. Kỳ vọng: PASS.
- [ ] **Step 5: Viết test hỏng cho middleware.** Tạo `tests/unit/pathname-header.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }),
}))
import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { PATHNAME_HEADER } from '@/lib/auth/route-guard'

describe('updateSession', () => {
  it('ghi đè header đường dẫn bằng đường dẫn thật, kể cả khi client tự gửi', async () => {
    const req = new NextRequest('http://localhost/dang-nhap', { headers: { [PATHNAME_HEADER]: '/em/gia-mao' } })
    const res = await updateSession(req)
    expect(res.headers.get(`x-middleware-request-${PATHNAME_HEADER}`)).toBe('/dang-nhap')
  })
})
```

- [ ] **Step 6:** Chạy `pnpm vitest run tests/unit/pathname-header.test.ts`. Kỳ vọng: FAIL vì chưa có hằng `PATHNAME_HEADER` và header chưa được gắn.
- [ ] **Step 7: Gắn header trong middleware.**
  - Thêm hằng `PATHNAME_HEADER` vào `route-guard.ts`.
  - Ở đầu `updateSession`, **trước** dòng `let response = NextResponse.next({ request })`, gọi `request.headers.set(PATHNAME_HEADER, request.nextUrl.pathname)`.
  - Cả hai chỗ đang gọi `NextResponse.next({ request })` (ở đầu hàm và trong `setAll`) đều chuyển header request đã sửa xuống, nên không cần đổi chỗ nào khác.
- [ ] **Step 8:** Chạy `pnpm vitest run tests/unit/pathname-header.test.ts tests/unit/route-guard.test.ts tests/unit/role-cookie.test.ts`. Kỳ vọng: PASS.
- [ ] **Step 9: Commit.**

```bash
git add lib/auth/route-guard.ts lib/student/flags.ts lib/supabase/middleware.ts tests/unit/student-flags.test.ts tests/unit/pathname-header.test.ts
git commit -m "feat(loading): pass request path to layouts and map student paths to page ids"
```

### Task 2: Khung xương cho hai khu và giữ 404 cho khu học sinh

**Files:**
- Create: `app/(teacher)/loading.tsx`, `app/em/loading.tsx`
- Modify: `app/em/layout.tsx`
- Test: `tests/unit/ui.test.tsx` (thêm một case), e2e có sẵn

**Interfaces:**
- Consumes: `PATHNAME_HEADER`, `studentPageForPath` (Task 1), `PageSkeleton` (`components/ui/Skeleton.tsx`).

- [ ] **Step 1: Chạy trước các test 404 làm mốc.** Lệnh: `pnpm exec playwright test tests/e2e/student-pages.spec.ts tests/e2e/settings.spec.ts tests/e2e/student-portal.spec.ts --project=desktop`. Kỳ vọng: PASS, đây là hành vi hiện tại.
- [ ] **Step 2: Thêm khung xương.** Mỗi file `loading.tsx` export default một component trả `<PageSkeleton />`.
- [ ] **Step 3:** Chạy lại lệnh ở Step 1. Kỳ vọng: các test `… trả 404` / `… thì 404` **FAIL**, nhận 200 thay vì 404. Bước này xác nhận đúng lỗi đã đo khi thiết kế. Khi đo lúc thiết kế là chạy bản build, còn ở đây là `pnpm dev`. Nếu ở đây vẫn PASS thì ghi lại rồi làm tiếp Step 4: chặn ở layout vẫn cần cho bản production.
- [ ] **Step 4: Chặn ở layout học sinh.** Trong `app/em/layout.tsx`, sau dòng `const pages = visibleStudentPages(ctx.settings)`:
  - đọc `(await headers()).get(PATHNAME_HEADER)` (`headers` lấy từ `next/headers`);
  - đưa vào `studentPageForPath` để ra id trang;
  - nếu ra id khác `null` mà `!pages.has(id)` thì gọi `notFound()` (từ `next/navigation`).
  - Không có header hoặc ra `null` thì bỏ qua, để từng trang tự chặn.
- [ ] **Step 5:** Chạy lại lệnh ở Step 1. Kỳ vọng: PASS hết.
- [ ] **Step 6: Unit test cho hai file loading.** Thêm vào `tests/unit/ui.test.tsx` test `'loading của hai khu hiện khung xương'`:
  - import default từ `@/app/(teacher)/loading` và `@/app/em/loading`;
  - render từng cái;
  - assert `screen.getByRole('status', { name: 'Đang tải' })`.

  Chạy `pnpm vitest run tests/unit/ui.test.tsx`. Kỳ vọng: PASS.
- [ ] **Step 7: Commit.**

```bash
git add "app/(teacher)/loading.tsx" app/em/loading.tsx app/em/layout.tsx tests/unit/ui.test.tsx
git commit -m "feat(loading): page skeletons for teacher and student areas, keep real 404 for disabled student pages"
```

### Task 3: Màn tên lửa khi đăng nhập và spinner cho nút vào nhanh

**Files:**
- Create: `app/(auth)/dang-nhap/LaunchOverlay.tsx`
- Modify:
  - `app/(auth)/dang-nhap/login.css`
  - `app/(auth)/dang-nhap/LoginForm.tsx`
  - `app/(auth)/dang-nhap/DemoButtons.tsx`
- Test: `tests/unit/launch-overlay.test.tsx` (mới), `tests/e2e/login.spec.ts` (test `sai mật khẩu`)

**Interfaces:**
- Produces: `export function LaunchOverlay({ show }: { show: boolean })`, client component (`'use client'`).

- [ ] **Step 1: Viết test hỏng.** Tạo `tests/unit/launch-overlay.test.tsx` với hai test:
  - `'đang đăng nhập: phủ ngoài cùng body, báo trạng thái'`: render `<LaunchOverlay show />`, rồi assert:
    - `screen.getByRole('status')` có nội dung `Đang chuẩn bị trạm…`;
    - `screen.getByTestId('launch-overlay').parentElement === document.body`.
  - `'không đăng nhập: không render gì'`: render `<LaunchOverlay show={false} />`, rồi assert `screen.queryByTestId('launch-overlay')` là `null`.
- [ ] **Step 2:** Chạy `pnpm vitest run tests/unit/launch-overlay.test.tsx`. Kỳ vọng: FAIL vì chưa có module.
- [ ] **Step 3: Viết `LaunchOverlay`.**
  - Hành vi:
    - `show` là `false` thì trả `null`. Vì vậy lúc render trên server không đụng tới `document`.
    - `show` là `true` thì `createPortal` vào `document.body` một `div` có `data-testid="launch-overlay"`, `role="status"`, `aria-live="polite"`, class `sp-launch`.
  - Nội dung: `<img src="/brand/login/ten-lua.webp" alt="" aria-hidden="true" className="sp-launch-rocket">` và chữ `Đang chuẩn bị trạm…`. Thẻ `<img>` cần dòng `{/* eslint-disable-next-line @next/next/no-img-element */}` như các ảnh khác trong `page.tsx`.
  - CSS trong `login.css`:
    - `.sp-launch`:
      - `position: fixed; inset: 0; z-index: 50`, chữ trắng, căn giữa;
      - nền chép theo nền nhiều lớp gradient của `.sp`. Biến `--sp-*` chỉ khai báo trên `.sp` nên ở đây phải ghi trực tiếp mã màu;
      - `animation: sp-launch-in 200ms ease-out 300ms both`, với `@keyframes sp-launch-in { from { opacity: 0 } }`.
    - `.sp-launch-rocket`: `animation: sp-hover 5s ease-in-out infinite`.
    - Trong khối `prefers-reduced-motion` có sẵn: tắt animation của `.sp-launch-rocket`, và cho `.sp-launch` dùng `animation-duration: 0s`. Như vậy lớp phủ vẫn hiện, chỉ bỏ hiệu ứng mờ dần.
- [ ] **Step 4:** Chạy lại lệnh ở Step 2. Kỳ vọng: PASS.
- [ ] **Step 5: Gắn lớp phủ vào hai form.**
  - `LoginForm`: render `<LaunchOverlay show={pending} />` ở trong `<form>`.
  - `DemoButtons`:
    - thêm state `const [clicked, setClicked] = useState<Role | null>(null)`, gán trong `onClick` của từng nút;
    - render `<LaunchOverlay show={pending} />`;
    - nút có `pending && clicked === r` thì thay icon tên lửa bằng `<Icon d={ICONS.spinner} size={18} className="motion-safe:animate-spin" />` và đổi chữ thành `Đang bay…`.
- [ ] **Step 6: Thêm kiểm tra e2e cho trường hợp sai mật khẩu.** Trong test `'sai mật khẩu'` của `tests/e2e/login.spec.ts`, sau assert lỗi có sẵn, thêm `await expect(page.getByTestId('launch-overlay')).toHaveCount(0)`. Chạy `pnpm exec playwright test tests/e2e/login.spec.ts --project=desktop`. Kỳ vọng: PASS.
- [ ] **Step 7:** Chạy `pnpm vitest run tests/unit/hex-guard.test.ts`. Kỳ vọng: PASS.
- [ ] **Step 8: Commit.**

```bash
git add "app/(auth)/dang-nhap" tests/unit/launch-overlay.test.tsx tests/e2e/login.spec.ts
git commit -m "feat(loading): rocket launch overlay while signing in, spinner on quick-entry buttons"
```

### Task 4: Spinner trên link chuyển khu

**Files:**
- Create: `components/ui/LinkPendingIcon.tsx`
- Modify:
  - `app/globals.css`
  - `components/layout/Sidebar.tsx`
  - `components/layout/Header.tsx`
  - `app/(teacher)/cai-dat/SettingsClient.tsx`
  - `app/em/layout.tsx`
  - `app/trinh-chieu/page.tsx`
  - `app/trinh-chieu/DisplayClient.tsx`
- Test: `tests/unit/link-pending-icon.test.tsx` (mới)

**Interfaces:**
- Produces: `export function LinkPendingIcon({ children, size = 18 }: { children?: ReactNode; size?: number })`, client component. Phải đặt **bên trong** một `<Link>`, đúng yêu cầu của `useLinkStatus`.

- [ ] **Step 1: Viết test hỏng.** Tạo `tests/unit/link-pending-icon.test.tsx`, mock `next/link` bằng `vi.mock('next/link', () => ({ useLinkStatus: vi.fn() }))`. Ba test:
  - `'bình thường: chỉ có icon gốc'`: `useLinkStatus` trả `{ pending: false }`. Render với children là `<svg data-testid="goc" />`. Assert có `goc`, không có chữ `Đang tải…`, không có phần tử `.lp-new`.
  - `'đang chuyển: thêm spinner và chữ cho đọc màn hình'`: `useLinkStatus` trả `{ pending: true }`. Assert:
    - vẫn có `goc`, và `goc` nằm trong phần tử `.lp-old`;
    - có `.lp-new` chứa `svg path[d="${ICONS.spinner}"]`;
    - có chữ `Đang tải…`.
  - `'không có icon gốc: chỉ hiện spinner khi đang chuyển'`: không truyền children. Khi `pending` là `false` thì container rỗng. Khi `pending` là `true` thì có `.lp-new`.
- [ ] **Step 2:** Chạy `pnpm vitest run tests/unit/link-pending-icon.test.tsx`. Kỳ vọng: FAIL vì chưa có module.
- [ ] **Step 3: Viết `LinkPendingIcon` và CSS.**
  - Lúc không chuyển: render `children` như cũ.
  - Lúc đang chuyển:
    - bọc trong `<span className="relative inline-flex">`;
    - `children` nằm trong `<span className="lp-old">`;
    - spinner `<Icon d={ICONS.spinner} size={size} className="motion-safe:animate-spin" />` nằm trong `<span className="lp-new …">`. Có children thì `lp-new` phủ tuyệt đối lên trên, không có thì nằm inline;
    - thêm `<span className="sr-only">Đang tải…</span>`.
  - CSS trong `globals.css`:
    - `.lp-old { animation: lp-out 0s 100ms both }` với `@keyframes lp-out { to { opacity: 0 } }`;
    - `.lp-new { animation: lp-in 0s 100ms both }` với `@keyframes lp-in { from { opacity: 0 } }`.

  Animation dài 0s nên không phải chuyển động, không cần tắt khi giảm chuyển động.
- [ ] **Step 4:** Chạy lại lệnh ở Step 2. Kỳ vọng: PASS.
- [ ] **Step 5: Gắn vào 7 link.**
  - Bọc icon có sẵn bằng `<LinkPendingIcon>…</LinkPendingIcon>`:
    - `Header.tsx`: icon mắt;
    - `Sidebar.tsx`: icon mắt ở nút "Xem như học sinh", và `NavIconChip` của mục có `it.id === 'display'`. Các mục khác giữ nguyên;
    - `SettingsClient.tsx`: icon mắt trong `ButtonLink` tới `/em`.
  - Link chưa có icon thì thêm `<LinkPendingIcon />` không có children, đặt trước chữ:
    - "Quay lại trang cô giáo" trong `app/em/layout.tsx`;
    - 2 link "Thoát trình chiếu" trong `app/trinh-chieu/page.tsx` và `DisplayClient.tsx`.

    Nếu link chưa có `gap` thì thêm `gap-2`.
- [ ] **Step 6:** Chạy `pnpm vitest run` và `pnpm lint`. Kỳ vọng: PASS, không có lỗi lint mới.
- [ ] **Step 7: Commit.**

```bash
git add components/ui/LinkPendingIcon.tsx app/globals.css components/layout/Sidebar.tsx components/layout/Header.tsx "app/(teacher)/cai-dat/SettingsClient.tsx" app/em/layout.tsx app/trinh-chieu tests/unit/link-pending-icon.test.tsx
git commit -m "feat(loading): pending spinner on links that switch between teacher, student and display areas"
```

### Task 5: Kiểm tra toàn bộ

- [ ] **Step 1:** Chạy `pnpm vitest run && pnpm lint && pnpm build`. Kỳ vọng: PASS hết, build không lỗi.
- [ ] **Step 2:** Chạy `pnpm exec playwright test tests/e2e/login.spec.ts tests/e2e/accounts.spec.ts tests/e2e/student-pages.spec.ts tests/e2e/settings.spec.ts tests/e2e/student-portal.spec.ts tests/e2e/shell.spec.ts tests/e2e/display.spec.ts`. Kỳ vọng: PASS trên cả 3 project.
- [ ] **Step 3: Xem bằng trình duyệt.** Bật dev server bằng `preview_start` với cấu hình `web` có sẵn, rồi kiểm và chụp màn hình bằng chứng:
  - đăng nhập bằng form và bằng nút vào nhanh, thấy lớp phủ tên lửa;
  - chuyển 2 trang ở khu cô giáo và 2 trang ở khu học sinh, thấy khung xương;
  - bấm "Xem như học sinh" và vào/ra trình chiếu, thấy spinner trên link;
  - bật giảm chuyển động: dùng `javascript_tool` kiểm `matchMedia('(prefers-reduced-motion: reduce)')`, hoặc kiểm `getComputedStyle` của `.sp-launch` có opacity 1 sau 300ms.

  Nếu chuyển trang nhanh quá không bắt được màn chờ, dùng DevTools để làm chậm mạng, hoặc ghi rõ là không quan sát được.
- [ ] **Step 4:** Báo kết quả. Có bước nào không chạy được (ví dụ Supabase local chưa bật) thì nói rõ.
