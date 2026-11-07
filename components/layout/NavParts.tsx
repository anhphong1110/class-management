import { Icon } from '@/components/ui/Icon'
import { TONES, type Tone } from '@/components/ui/tones'
import { brandLines, schoolLabel } from '@/lib/classes/brand'

type BrandProps = {
  classLogoUrl: string | null
  schoolLogoUrl?: string | null
  className: string
  brandName?: string | null
  schoolName?: string | null
}

/** Hai khối logo (trường, lớp) dùng chung cho thanh bên cô giáo và học sinh. */
export function BrandBlocks({ classLogoUrl, schoolLogoUrl, className, brandName, schoolName }: BrandProps) {
  const brand = brandLines({ class_name: className, brand_title: brandName })
  return (
    <>
      <div className="flex items-center gap-2.5 px-1.5">
        <div className="relative size-11 flex-none overflow-hidden rounded-full border-2 border-edge bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={schoolLogoUrl ?? '/brand/logo-truong.jpg'}
            alt={`Logo ${schoolLabel(schoolName).toLocaleLowerCase('vi-VN')}`}
            className="absolute -left-px -top-px size-[46px] max-w-none object-cover"
          />
        </div>
        <div className="font-display text-[13.5px] font-extrabold leading-[1.15] tracking-[.04em] text-primary-deep">
          {schoolLabel(schoolName).toLocaleUpperCase('vi-VN')}
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={classLogoUrl ?? '/brand/logo-lop.jpg'}
          alt="Logo lớp"
          className="size-11 flex-none rounded-full border-2 border-edge bg-white object-cover"
        />
        <div className="font-display text-[17px] font-extrabold leading-[1.05] tracking-[.02em] text-ink">
          {brand.top}
          {brand.accent && (
            <>
              <br />
              <span className="text-primary-strong">{brand.accent}</span>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/** Ô icon pastel của một mục menu; khi mục đang chọn thì chuyển sang nền trắng mờ. */
export function NavIconChip({
  icon,
  on,
  tone,
  className = '',
  onClassName = 'bg-white/25 text-[#FFE08A]',
}: {
  icon: string
  on: boolean
  tone: Tone
  className?: string
  onClassName?: string
}) {
  return (
    <span
      className={`flex size-[30px] flex-none items-center justify-center rounded-[10px] ${className} ${
        on ? onClassName : TONES[tone]
      }`}
    >
      <Icon d={icon} size={20} />
    </span>
  )
}
