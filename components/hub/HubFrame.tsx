import { ButtonLink } from '@/components/ui/Button'
import { Icon, ICONS } from '@/components/ui/Icon'
import { getLearningHubUrl } from '@/lib/hub/config'

/**
 * Nhúng web Study with Bông vào khung nội dung. Game và sách lật trong đó tự mở tab mới (target=_blank).
 * Nút "Mở trong tab mới" nằm ngoài iframe để vẫn dùng được nếu web kia sau này chặn nhúng.
 */
export function HubFrame({ url = getLearningHubUrl() }: { url?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[15px] font-semibold text-muted">
          Trò chơi, sách lật và video. Bấm vào một món để mở ở tab mới.
        </p>
        <ButtonLink href={url} target="_blank" rel="noopener noreferrer" variant="secondary">
          <Icon d={ICONS.book} size={18} />
          Mở trong tab mới
        </ButtonLink>
      </div>
      <div
        data-testid="hub-frame"
        className="clay-card overflow-hidden"
      >
        <iframe
          src={url}
          title="Kho học liệu"
          loading="lazy"
          allowFullScreen
          // Không có allow-top-navigation*: trang nhúng không tự chuyển được cả trang lớp. Link target=_blank trong đó
          // vẫn mở tab mới bình thường nhờ allow-popups-to-escape-sandbox.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[calc(100dvh-14rem)] min-h-[480px] w-full border-0 lg:h-[calc(100dvh-9rem)]"
        />
      </div>
    </div>
  )
}
