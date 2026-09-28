/**
 * 불러오는 동안 내용 자리에 보여주는 회색 상자.
 * 천천히 옅어졌다 진해지고, "동작 줄이기"를 켠 기기에서는 움직이지 않는다.
 * 모서리는 기본 radius-sm. className에 rounded-* 를 주면 그걸 쓴다 (두 클래스가 겹치면 어느 쪽이 이길지 모르므로).
 */
export function Skeleton({ className = "" }: { className?: string }) {
  const radius = /(^|\s)rounded-/.test(className) ? "" : "rounded-sm";
  return (
    <span
      aria-hidden
      className={`block animate-pulse bg-surface-sunken motion-reduce:animate-none ${radius} ${className}`}
    />
  );
}
