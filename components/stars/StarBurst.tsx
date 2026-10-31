const STARS = [0, 1, 2, 3, 4, 5, 6]

/** Bảy ngôi sao bay lên khi cộng sao thành công. `playKey` đổi giá trị thì chạy lại (flyA/flyB luân phiên). */
export function StarBurst({ playKey }: { playKey: number }) {
  if (playKey <= 0) return null
  const anim = playKey % 2 ? 'flyA' : 'flyB'
  return (
    <div
      data-testid="star-burst"
      aria-hidden="true"
      className="star-burst pointer-events-none absolute bottom-[84px] right-12 h-[120px] w-[180px]"
    >
      {STARS.map((k) => (
        <svg
          key={`${playKey}-${k}`}
          viewBox="0 0 24 24"
          width="30"
          height="30"
          className="absolute bottom-0 opacity-0"
          style={{ left: 8 + k * 22, animation: `${anim} 1.4s ease-out ${(k * 0.09).toFixed(2)}s 1 both` }}
        >
          <polygon
            points="12,2 15,9 22,9.5 16.5,14.5 18.5,22 12,17.5 5.5,22 7.5,14.5 2,9.5 9,9"
            fill="#FFC857"
            stroke="#E0A020"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  )
}
