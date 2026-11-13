# Kho học liệu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm mục menu "Kho học liệu" cho cô giáo và học sinh, mở trang nhúng web Study with Bông (mặc định Góc học tập Lớp 5).

**Architecture:** Một thành phần dùng chung `HubFrame` (iframe + nút "Mở trong tab mới") và một hàm đọc địa chỉ `getLearningHubUrl`. Hai trang mỏng bọc nó: `/kho-hoc-lieu` (cô) và `/em/kho-hoc-lieu` (học sinh). Mục menu thêm vào `TEACHER_NAV` và `STUDENT_NAV`; không đụng cơ sở dữ liệu.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind 4, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-kho-hoc-lieu-design.md`

## Global Constraints

- Nhãn menu và tiêu đề trang đều là **"Kho học liệu"**; đường dẫn `/kho-hoc-lieu` (cô) và `/em/kho-hoc-lieu` (học sinh); id mục menu là `hub`.
- Địa chỉ mặc định **`https://studywithbong.netlify.app/#/khoi/5`**, ghi đè bằng biến `NEXT_PUBLIC_LEARNING_HUB_URL`. Nút "Mở trong tab mới" dùng cùng địa chỉ.
- Không công tắc, không cột DB, không migration. Học sinh luôn thấy mục này.
- iframe có `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"` (không có `allow-top-navigation*`; đã sửa sau review, bản đầu của kế hoạch ghi "không sandbox"), `title="Kho học liệu"`, `loading="lazy"`, cho phép toàn màn hình.
- Link ra ngoài: `target="_blank"` và `rel="noopener noreferrer"`.
- Menu cô: mục `hub` thuộc nhóm "Công cụ", đặt sau `report` và trước `settings` (các nhóm phải liền nhau).
- Không thêm mã hex mới trong file `.tsx` (có `tests/unit/hex-guard.test.ts`); dùng token màu/`TONES`.
- Chữ trên giao diện bằng tiếng Việt, theo giọng các trang hiện có.
- Không sửa `/trinh-chieu` và không thêm ô lối tắt "Kho học liệu" ở trang chủ học sinh.

## Review Focus

- Biến môi trường đặt nhưng rỗng hoặc toàn khoảng trắng: dùng địa chỉ mặc định (không để iframe `src=""`, vì nó tải lại chính trang lớp). Test ở Task 1.
- Biến môi trường là giá trị lạ (`javascript:alert(1)`, `http://...`, chuỗi không phải URL): dùng địa chỉ mặc định; chỉ nhận `https:`. Test ở Task 1.
- Học sinh gõ tay `/kho-hoc-lieu` bị đưa về `/em`; khách chưa đăng nhập bị đưa về trang đăng nhập. Test ở Task 2.
- Cô bấm "Xem như học sinh" rồi vào `/em/kho-hoc-lieu` vẫn xem được (không 404). Test ở Task 3.
- Điện thoại 375px: mục thứ 8 của học sinh nằm trong "Thêm", trang không tràn ngang, khung không bị thanh tab đáy che. Test ở Task 3.

---

### Task 1: Địa chỉ cấu hình và thành phần HubFrame

**Files:**
- Create: `lib/hub/config.ts`
- Create: `components/hub/HubFrame.tsx`
- Modify: `components/ui/Icon.tsx` (thêm khóa `book` vào `ICONS`)
- Modify: `.env.example` (thêm biến tùy chọn)
- Test: `tests/unit/hub.test.tsx`

**Interfaces:**
- Produces:
  - `export const DEFAULT_LEARNING_HUB_URL = 'https://studywithbong.netlify.app/#/khoi/5'` trong `lib/hub/config.ts`
  - `export function getLearningHubUrl(raw?: string | undefined): string` trong `lib/hub/config.ts` (tham số mặc định đọc `process.env.NEXT_PUBLIC_LEARNING_HUB_URL`, viết đúng nguyên văn biểu thức này để Next thay giá trị lúc build)
  - `export function HubFrame(props: { url?: string }): JSX.Element` trong `components/hub/HubFrame.tsx` (server component, mặc định `url = getLearningHubUrl()`)
  - `ICONS.book` (path SVG quyển sách) trong `components/ui/Icon.tsx`

- [ ] **Step 1: Tạo nhánh làm việc**

Run: `git switch -c feat/kho-hoc-lieu main` (các file spec/plan chưa theo dõi sẽ đi theo sang nhánh mới)
Expected: `Switched to a new branch 'feat/kho-hoc-lieu'`

- [ ] **Step 2: Viết test thất bại trong `tests/unit/hub.test.tsx`**

Với `getLearningHubUrl`:
- `it('không có biến thì dùng địa chỉ mặc định Lớp 5')`: `getLearningHubUrl(undefined)` bằng `'https://studywithbong.netlify.app/#/khoi/5'`.
- `it('dùng giá trị https hợp lệ')`: `getLearningHubUrl('https://abc.netlify.app/#/khoi/3')` trả lại đúng chuỗi đó.
- `it.each(['', '   ', 'not a url', 'javascript:alert(1)', 'http://insecure.example/', 'ftp://x.y/'])`: kết quả bằng `DEFAULT_LEARNING_HUB_URL`.
- `it('cắt khoảng trắng hai đầu')`: `getLearningHubUrl('  https://abc.netlify.app/  ')` bằng `'https://abc.netlify.app/'`.

Với `HubFrame` (render bằng Testing Library, `cleanup` sau mỗi test):
- `it('iframe có title, src, lazy, không sandbox')`: `screen.getByTitle('Kho học liệu')` có `src` bằng url truyền vào, `loading="lazy"`, và `hasAttribute('sandbox')` là `false`.
- `it('luôn có nút Mở trong tab mới ngoài iframe')`: `screen.getByRole('link', { name: 'Mở trong tab mới' })` có `href` bằng url, `target="_blank"`, `rel="noopener noreferrer"`.
- `it('không truyền url thì dùng mặc định')`: iframe có `src` bằng `DEFAULT_LEARNING_HUB_URL`.

- [ ] **Step 3: Chạy để thấy thất bại**

Run: `pnpm vitest run tests/unit/hub.test.tsx`
Expected: FAIL (không import được `@/lib/hub/config`)

- [ ] **Step 4: Cài đặt `lib/hub/config.ts`**

Dùng `new URL(raw.trim())` trong `try`; chấp nhận khi `protocol === 'https:'`, trả `raw.trim()` (giữ nguyên phần `#...`); mọi trường hợp khác trả `DEFAULT_LEARNING_HUB_URL`.

- [ ] **Step 5: Cài đặt `ICONS.book` và `HubFrame`**

`ICONS.book`: `"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"`.
`HubFrame`: một khối `flex flex-col gap-3`; hàng trên có dòng chữ giải thích ngắn ("Trò chơi, sách lật và video. Bấm vào một món để mở ở tab mới.") và nút-link "Mở trong tab mới" (kiểu nút phụ hiện có, kèm icon, tối thiểu 44px cao); bên dưới là `<iframe>` bọc trong thẻ `clay-card` có `overflow-hidden`, `data-testid="hub-frame"`, chiều cao cố định theo `dvh` (khoảng `calc(100dvh - 9rem)`, tối thiểu 480px; trên màn hình dưới `lg` trừ thêm chiều cao thanh tab đáy học sinh, khoảng 7rem), `allowFullScreen`, `referrerPolicy="no-referrer-when-downgrade"`.

- [ ] **Step 6: Thêm vào `.env.example`**

Thêm một đoạn có chú thích tiếng Việt: biến `NEXT_PUBLIC_LEARNING_HUB_URL=` tùy chọn, bỏ trống thì dùng `https://studywithbong.netlify.app/#/khoi/5`.

- [ ] **Step 7: Chạy test**

Run: `pnpm vitest run tests/unit/hub.test.tsx tests/unit/hex-guard.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/hub components/hub components/ui/Icon.tsx .env.example tests/unit/hub.test.tsx docs/superpowers
git commit -m "feat(hub): learning hub URL config and iframe frame component"
```

---

### Task 2: Mục menu và trang cho cô giáo

**Files:**
- Modify: `components/layout/nav.ts` (`TEACHER_NAV`, `TEACHER_NAV_META`)
- Create: `app/(teacher)/kho-hoc-lieu/page.tsx`
- Modify: `tests/unit/nav.test.ts`
- Modify: `tests/unit/route-guard.test.ts`
- Modify: `tests/e2e/shell.spec.ts`

**Interfaces:**
- Consumes: `HubFrame` (Task 1), `ICONS.book` (Task 1), `requireTeacher()` từ `@/lib/auth/session`, `Header({ title, subtitle })` từ `@/components/layout/Header`.
- Produces: mục `{ id: 'hub', label: 'Kho học liệu', href: '/kho-hoc-lieu', icon: ICONS.book }` ở vị trí chỉ số 12 của `TEACHER_NAV` (sau `report`, trước `settings`); `TEACHER_NAV_META.hub = { group: 'Công cụ', tone: 'star' }`.

- [ ] **Step 1: Cập nhật test thất bại**

Trong `tests/unit/nav.test.ts`:
- Đổi `'có 14 mục...'` thành 15 mục; `TEACHER_NAV[0].label` vẫn `'Tổng quan'`, `TEACHER_NAV.at(-1)!.label` vẫn `'Hồ sơ và avatar'`; tập `href` duy nhất có kích thước 15.
- Thêm `it('Kho học liệu nằm sau Thống kê – Báo cáo và trước Cài đặt')`: lấy `TEACHER_NAV.map(n => n.id)`, `indexOf('hub') === indexOf('report') + 1` và `indexOf('settings') === indexOf('hub') + 1`; mục `hub` có `href '/kho-hoc-lieu'`, `label 'Kho học liệu'`.
- Thêm `it('mỗi mục có nhóm và các nhóm liền nhau')`: mọi `id` có trong `TEACHER_NAV_META`; duyệt theo thứ tự, mỗi tên nhóm chỉ xuất hiện thành một đoạn liên tiếp; `TEACHER_NAV_META.hub.group === 'Công cụ'`.

Trong `tests/unit/route-guard.test.ts` thêm hai test: học sinh vào `/kho-hoc-lieu` được chuyển về `/em`; khách (`role: null`) vào `/kho-hoc-lieu` được chuyển về `/dang-nhap?next=%2Fkho-hoc-lieu`.

Trong `tests/e2e/shell.spec.ts`: thêm `'/kho-hoc-lieu': 'Kho học liệu'` vào `PAGE_TITLES`; đổi số link Sidebar kỳ vọng từ 14 thành 15.

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `pnpm vitest run tests/unit/nav.test.ts tests/unit/route-guard.test.ts`
Expected: nav.test FAIL (độ dài 14 ≠ 15); route-guard test có thể đã PASS (route guard chặn mọi đường dẫn ngoài `/em` cho học sinh), vẫn giữ làm test khóa hành vi.

- [ ] **Step 3: Sửa `components/layout/nav.ts`**

Chèn mục `hub` vào mảng `TEACHER_NAV` đúng vị trí đã nêu, dùng `icon: ICONS.book` (import `ICONS` từ `@/components/ui/Icon`); thêm khóa `hub` vào `TEACHER_NAV_META` giữa `report` và `settings` với giá trị đã nêu.

- [ ] **Step 4: Tạo `app/(teacher)/kho-hoc-lieu/page.tsx`**

`export default async function Page()`: gọi `await requireTeacher()`, trả về `<Header title="Kho học liệu" subtitle="Trò chơi, sách lật và video cho cả lớp" />` cùng `<HubFrame />`, bọc bằng fragment như các trang cô khác (theo mẫu `app/(teacher)/thong-bao/page.tsx`).

- [ ] **Step 5: Chạy test đơn vị**

Run: `pnpm vitest run tests/unit/nav.test.ts tests/unit/route-guard.test.ts && pnpm exec tsc --noEmit`
Expected: PASS, không lỗi kiểu

- [ ] **Step 6: Commit**

```bash
git add components/layout/nav.ts "app/(teacher)/kho-hoc-lieu" tests/unit/nav.test.ts tests/unit/route-guard.test.ts tests/e2e/shell.spec.ts
git commit -m "feat(hub): teacher menu item and Kho hoc lieu page"
```

---

### Task 3: Mục menu và trang cho học sinh

**Files:**
- Modify: `lib/student/flags.ts` (`StudentPageId`, `STUDENT_NAV`, `STUDENT_TITLES`, `visibleStudentPages`)
- Modify: `components/layout/nav.ts` (`STUDENT_NAV_TONES`)
- Create: `app/em/kho-hoc-lieu/page.tsx`
- Create: `tests/e2e/hub.spec.ts`
- Modify: `tests/unit/student-flags.test.ts`
- Modify: `tests/e2e/student-portal.spec.ts`

**Interfaces:**
- Consumes: `HubFrame` (Task 1), `ICONS.book`, `requireStudentPage(id: StudentPageId)` từ `@/lib/student/queries`.
- Produces: `'hub'` thuộc `StudentPageId`; `STUDENT_NAV` có mục thứ 8 `{ id: 'hub', label: 'Kho học liệu', href: '/em/kho-hoc-lieu', icon: ICONS.book }`; `STUDENT_TITLES.hub === 'Kho học liệu'`; `STUDENT_NAV_TONES.hub === 'purple'`; `visibleStudentPages` luôn chứa `'hub'`.

- [ ] **Step 1: Cập nhật test thất bại**

Trong `tests/unit/student-flags.test.ts`:
- `STUDENT_NAV`: đổi thành 8 mục, mục cuối `['hub', 'Kho học liệu', '/em/kho-hoc-lieu']`; tên test đổi thành "8 mục".
- `STUDENT_TITLES`: thêm `hub: 'Kho học liệu'`.
- `bật hết`: kết quả sắp xếp là `['att','gifts','home','hub','news','rank','stars','tt']`.
- `tắt hết`: kết quả là `['home', 'hub']`.
- `it.each` ẩn trang khi tắt cờ: `pages.size` là 7.
- `mỗi cờ chỉ mở đúng trang của nó`: `['home', 'hub', 'rank']`.
- Thêm `it('hub luôn hiện, không phụ thuộc cờ nào')`: `visibleStudentPages(ALL_OFF).has('hub')` là `true`.

Trong `tests/e2e/student-portal.spec.ts`: test "menu 7 mục" đổi thành 8 mục, thêm `'Kho học liệu'` cuối danh sách `toHaveText`; test cô tắt bảng xếp hạng kỳ vọng 7 link thay vì 6.

Tạo `tests/e2e/hub.spec.ts` (mẫu đăng nhập theo `tests/e2e/helpers.ts` và cách `student-portal.spec.ts` mở trang học sinh), không tải nội dung từ web ngoài, chỉ kiểm thuộc tính:
- `test('cô: /kho-hoc-lieu có khung nhúng, nút tab mới, không tràn ngang')`: đăng nhập `Giáo viên` / `co.khanh`, `goto('/kho-hoc-lieu')`; `heading level 1 'Kho học liệu'` hiện; `iframe[title="Kho học liệu"]` có `src` `https://studywithbong.netlify.app/#/khoi/5`; link `Mở trong tab mới` có `target="_blank"`; `document.documentElement.scrollWidth <= window.innerWidth`.
- `test('học sinh: /em/kho-hoc-lieu hiện khung, mục menu có trong menu')`: đăng nhập học sinh, mở menu (bấm "Thêm" nếu đang ở điện thoại), bấm link `Kho học liệu` rồi chờ URL `**/em/kho-hoc-lieu`; h1 `Kho học liệu`, iframe cùng `src`; không tràn ngang; khung nằm trọn trên thanh tab đáy (đáy iframe không vượt `top` của `nav[aria-label="Menu học sinh"]` khi viewport dưới 1024px, sau khi cuộn xuống cuối trang).
- `test('cô xem như học sinh vẫn vào được /em/kho-hoc-lieu')`: đăng nhập cô, `goto('/em/kho-hoc-lieu')` trả status khác 404 và h1 hiện.

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `pnpm vitest run tests/unit/student-flags.test.ts`
Expected: FAIL (số mục 7 ≠ 8)

- [ ] **Step 3: Sửa `lib/student/flags.ts` và `STUDENT_NAV_TONES`**

Thêm `'hub'` vào union `StudentPageId`; thêm mục cuối `STUDENT_NAV` và khóa `hub` ở `STUDENT_TITLES` đúng giá trị đã nêu; `visibleStudentPages` thêm `'hub'` vào tập khởi đầu cùng `'home'` (không cần cờ). Trong `nav.ts` thêm `hub: 'purple'` vào `STUDENT_NAV_TONES`. `app/em/page.tsx` không đổi vì `SHORTCUTS` không có khóa `hub`, nên trang chủ không sinh ô lối tắt.

- [ ] **Step 4: Tạo `app/em/kho-hoc-lieu/page.tsx`**

`export default async function HubPage()`: gọi `await requireStudentPage('hub')`, trả về `<HubFrame />` (tiêu đề h1 do `StudentHeader` lấy từ `STUDENT_TITLES`, nên không thêm h1 nữa).

- [ ] **Step 5: Chạy test đơn vị, kiểu và lint**

Run: `pnpm vitest run && pnpm exec tsc --noEmit && pnpm lint`
Expected: toàn bộ PASS, không lỗi kiểu, không lỗi lint

- [ ] **Step 6: Chạy e2e nếu có cơ sở dữ liệu cục bộ**

Run: `pnpm exec playwright test tests/e2e/hub.spec.ts tests/e2e/shell.spec.ts tests/e2e/student-portal.spec.ts`
Expected: PASS ở cả ba dự án (mobile, tablet, desktop). Cần `.env.local` và dữ liệu mẫu (`pnpm seed:dev`); nếu máy không có, ghi rõ trong báo cáo là e2e chưa chạy, không nói là đã qua.

- [ ] **Step 7: Commit**

```bash
git add lib/student/flags.ts components/layout/nav.ts "app/em/kho-hoc-lieu" tests/unit/student-flags.test.ts tests/e2e/hub.spec.ts tests/e2e/student-portal.spec.ts
git commit -m "feat(hub): student menu item and Kho hoc lieu page"
```

---

### Task 4: Xem bằng mắt trên trình duyệt

**Files:** không sửa file nào (chỉ sửa nếu phát hiện lỗi bố cục).

- [ ] **Step 1: Chạy ứng dụng và xem hai trang**

Chạy dev server rồi đăng nhập cô giáo; vào "Kho học liệu" ở menu. Kỳ vọng: trang Góc học tập Lớp 5 hiện trong khung, menu bên trái giữ nguyên và mục "Kho học liệu" sáng khi đang chọn; bấm một món (ví dụ "Xây tháp năng lượng") rồi "Mở Trò chơi" thì game mở ở **tab mới**, web lớp không bị chuyển trang.

- [ ] **Step 2: Xem ở khổ điện thoại**

Với thu nhỏ 375px, đăng nhập học sinh: thanh tab đáy có 4 mục + "Thêm"; "Thêm" chứa "Kho học liệu"; mở trang thì khung không bị thanh tab che và trang không cuộn ngang. Chụp màn hình cả hai khổ làm bằng chứng.

- [ ] **Step 3: Sửa chiều cao khung nếu lệch rồi commit**

Nếu khung thừa/thiếu chiều cao, chỉnh công thức `calc(...)` trong `components/hub/HubFrame.tsx`, chạy lại `pnpm vitest run tests/unit/hub.test.tsx`, rồi:

```bash
git add components/hub/HubFrame.tsx
git commit -m "fix(hub): tune frame height on small screens"
```
