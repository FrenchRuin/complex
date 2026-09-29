type Props = { size?: number; className?: string };

/**
 * 감자밭 로고: 새싹이 난 웃는 감자. 꾸밈 전용이라 화면 읽기 프로그램에는 숨긴다 (이름은 옆 글자로).
 * 색은 potato·potato-soft·sprout 토큰 (라이트·다크 모두).
 */
export function PotatoLogo({ size = 72, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      {/* 새싹 */}
      <path d="M32 17c0-5 2-8 6-10-1 5-3 8-6 10Z" className="fill-sprout" />
      <path d="M31 17c-1-4-4-6-8-6 1 4 4 6 8 6Z" className="fill-sprout" />
      <path d="M31.5 18v-5" className="stroke-sprout" strokeWidth={2} strokeLinecap="round" />
      {/* 감자 몸통: 살짝 울퉁불퉁한 타원 */}
      <path
        d="M14 36c0-11 8-19 19-19 10 0 18 7 18 17 0 12-8 22-19 22-11 0-18-8-18-20Z"
        className="fill-potato-soft stroke-potato"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* 감자 점무늬 */}
      <circle cx={21} cy={31} r={1.4} className="fill-potato" opacity={0.45} />
      <circle cx={44} cy={43} r={1.6} className="fill-potato" opacity={0.45} />
      <circle cx={40} cy={27} r={1.1} className="fill-potato" opacity={0.45} />
      {/* 얼굴 */}
      <circle cx={27} cy={37} r={2.2} className="fill-potato" />
      <circle cx={38} cy={37} r={2.2} className="fill-potato" />
      <path d="M28 43c2.5 2.5 6.5 2.5 9 0" className="stroke-potato" strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </svg>
  );
}
