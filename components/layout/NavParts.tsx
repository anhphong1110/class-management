import { brandLines, schoolLabel } from '@/lib/classes/brand'

type BrandProps = {
  classLogoUrl: string | null
  schoolLogoUrl?: string | null
  className: string
  schoolName?: string | null
}

/** Hai khối logo (trường, lớp) dùng chung cho thanh bên cô giáo và học sinh. */
export function BrandBlocks({ classLogoUrl, schoolLogoUrl, className, schoolName }: BrandProps) {
  const brand = brandLines({ class_name: className })
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
