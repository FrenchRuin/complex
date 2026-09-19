const currency = new Intl.NumberFormat("ko-KR");

// dataviz 스킬의 검증된 카테고리 팔레트(6슬롯) — 우리 앱은 아직 자체 카테고리 색상 체계가 없어서 그대로 채택
const CATEGORY_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
];
const OTHER_COLOR = "#8b95a1"; // muted-foreground — "기타"는 카테고리 팔레트를 새로 소비하지 않음

export type ExpenseBreakdownItem = { name: string; amount: number };

function buildSegments(items: ExpenseBreakdownItem[]) {
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, CATEGORY_COLORS.length);
  const rest = sorted.slice(CATEGORY_COLORS.length);
  const restTotal = rest.reduce((sum, item) => sum + item.amount, 0);

  const segments = top.map((item, i) => ({ ...item, color: CATEGORY_COLORS[i] }));
  if (restTotal > 0) {
    segments.push({ name: "기타", amount: restTotal, color: OTHER_COLOR });
  }
  return segments;
}

export function ExpenseBreakdown({ items }: { items: ExpenseBreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">이번 달 지출 기록이 아직 없어요.</p>
    );
  }

  const segments = buildSegments(items);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.name}
            tabIndex={0}
            className="group/seg relative h-full outline-none"
            style={{ width: `${(segment.amount / total) * 100}%`, backgroundColor: segment.color }}
          >
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-opacity group-hover/seg:opacity-100 group-focus/seg:opacity-100">
              {segment.name} · {currency.format(segment.amount)}원
            </div>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {segments.map((segment) => (
          <li key={segment.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-foreground">{segment.name}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">
              {currency.format(segment.amount)}원 ·{" "}
              {Math.round((segment.amount / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
