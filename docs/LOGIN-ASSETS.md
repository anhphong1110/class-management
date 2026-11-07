# Trang đăng nhập: asset hình ảnh

Trang `/dang-nhap` dựng bằng thành phần web thật (`LoginScene.tsx`, `LoginForm.tsx`, `login.css`); hình 3D là ảnh WebP trong suốt ở `public/brand/login/`.

## Ảnh đang dùng

| File | Dùng ở đâu | Ghi chú |
|---|---|---|
| `nhom-nhan-vat.webp` | Cụm cô Mai Khanh và hai bạn học sinh, giữa cảnh | Một ảnh duy nhất, đã cắt sát |
| `tieu-de.webp` | Chữ 3D "Trạm không gian Năm 8" | Chỉ có bản "Năm 8"; lớp khác tự dùng chữ web có viền |
| `ten-lua.webp` | Tên lửa trong cảnh và ở góc khung đăng nhập | |
| `saturn-tim.webp`, `saturn-cam.webp` | Hai hành tinh | |
| `robot.webp`, `sao-tho.webp`, `sach.webp` | Robot, sao mascot, chồng sách | |
| `mat-trang.webp` | Mặt trăng ló sau khung đăng nhập (chỉ từ 1024px) | |
| `may.webp` | Dải mây ghim đáy trang | |
| `avatar-co.webp`, `avatar-hs.webp` | Đầu chibi trong hai tab Giáo viên/Học sinh | |
| `trai-dat.webp` | Quả Trái Đất lớn sau nhóm nhân vật | Xóa file này thì trang tự bỏ Trái Đất, chỉ còn vầng sáng mềm |
| `lap-lanh.svg`, `sao.svg` | Tia lấp lánh nhỏ (vẽ bằng code) | |

Tổng khoảng 550 KB.

## Thay ảnh

Tên file giữ nguyên thì chỉ cần ghi đè. Ảnh gốc từ ChatGPT là PNG khoảng 1,5 – 2 MB mỗi file, **không đưa thẳng vào `public/`**. Tối ưu trước (cắt viền trong suốt, đổi cỡ, WebP có alpha):

```bash
# Dùng sharp (đã có trong node_modules của dự án)
node -e "
const sharp = require('sharp');
sharp('goc.png').trim({ threshold: 1 }).resize({ width: 1100, withoutEnlargement: true })
  .webp({ quality: 86, alphaQuality: 100 }).toFile('public/brand/login/nhom-nhan-vat.webp');
"
```

Kích thước gợi ý (sau khi cắt): nhóm nhân vật ~1000 px, tiêu đề 1100 px, mây 2000 px, mặt trăng 760 px, các hình còn lại 360 – 640 px, avatar tab 200 px.

## Ghi chú kỹ thuật

- Màu, hiệu ứng và bố cục nằm trong `app/(auth)/dang-nhap/login.css` (bảng màu ở đầu file: navy `#24246B`, tím xanh `#514BDB`, lavender `#9470F5`, hồng sen `#F653A6`, cyan `#32D9F5`, vàng sao `#FFC94F`).
- Form giữ nguyên `LoginForm.tsx` và `actions.ts` (không đổi xác thực, phân quyền, điều hướng, thông báo lỗi).
- Chuyển động chỉ dùng `transform`/`opacity`, tự tắt khi hệ thống bật "Giảm chuyển động".
