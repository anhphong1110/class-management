import type { SettingsFlags } from '@/lib/settings/queries'
import { card, h2, type FlagKey } from './shared'
import { SwitchRow } from './SwitchRow'

const FEATURES: [FlagKey, string, string][] = [
  ['feature_missions', 'Nhiệm vụ và huy hiệu', 'Giáo viên tạo nhiệm vụ, học sinh nhận huy hiệu'],
  ['feature_random', 'Gọi tên ngẫu nhiên', 'Hiện trang quay số trong menu'],
  ['feature_display', 'Chế độ trình chiếu lớp học', 'Toàn màn hình, không hiện dữ liệu riêng tư'],
  ['feature_rewards', 'Trạm đổi quà', 'Tắt thì học sinh không thấy trang quà'],
]
const VIEWS: [FlagKey, string][] = [
  ['student_can_view_profile', 'Hồ sơ của mình'],
  ['student_can_view_history', 'Lịch sử sao của mình'],
  ['student_can_view_rank', 'Bảng xếp hạng'],
  ['student_can_view_rewards', 'Phần thưởng và đổi quà'],
  ['student_can_view_timetable', 'Thời khóa biểu'],
  ['student_can_view_news', 'Thông báo'],
  ['student_can_view_attendance', 'Lịch sử điểm danh của mình'],
]

export function FeaturesSection({
  settings,
  pending,
  onFlip,
}: {
  settings: SettingsFlags
  pending: boolean
  onFlip: (key: FlagKey, next: boolean) => void
}) {
  return (
    <section className={`${card} min-w-0 flex-[1_1_380px]`} aria-labelledby="feat-h">
      <h2 id="feat-h" className={h2}>
        Bật/tắt tính năng
      </h2>
      {FEATURES.map(([k, label, hint]) => (
        <SwitchRow key={k} flagKey={k} label={label} hint={hint} settings={settings} pending={pending} onFlip={onFlip} />
      ))}
      <h2 className={`${h2} mt-2.5`}>Học sinh được xem</h2>
      {VIEWS.map(([k, label]) => (
        <SwitchRow key={k} flagKey={k} label={label} settings={settings} pending={pending} onFlip={onFlip} />
      ))}
    </section>
  )
}
