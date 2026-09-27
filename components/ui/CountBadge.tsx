type Props = { count: number; label: string; className?: string };

/** 메뉴 옆 숫자 배지. 화면 읽기 프로그램에는 "미납 2건"처럼 읽힌다. */
export function CountBadge({ count, label, className = "" }: Props) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-label text-on-primary tabular-nums ${className}`}
    >
      <span aria-hidden>{count}</span>
      <span className="sr-only">
        {label} {count}건
      </span>
    </span>
  );
}
