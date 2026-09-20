const currency = new Intl.NumberFormat("ko-KR");

export type TrendPoint = { label: string; income: number; expense: number };

const WIDTH = 640;
const HEIGHT = 200;
const PAD_L = 44;
const PAD_R = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

function scaleY(value: number, max: number) {
  const usable = HEIGHT - PAD_TOP - PAD_BOTTOM;
  return PAD_TOP + usable - (value / max) * usable;
}

function scaleX(index: number, count: number) {
  const usable = WIDTH - PAD_L - PAD_R;
  return count <= 1 ? PAD_L : PAD_L + (index / (count - 1)) * usable;
}

function toPoints(values: number[], max: number) {
  return values.map((v, i) => `${scaleX(i, values.length)},${scaleY(v, max)}`).join(" ");
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.expense))) * 1.15;
  const incomePoints = points.map((p) => p.income);
  const expensePoints = points.map((p) => p.expense);
  const last = points.at(-1);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-4 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-income" aria-hidden />
          수입
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-expense" aria-hidden />
          지출
        </span>
        {last && (
          <span className="ml-auto text-[13px] font-medium text-foreground">
            {last.label}: 수입 {currency.format(last.income)}원 · 지출{" "}
            {currency.format(last.expense)}원
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[200px] w-full overflow-visible" role="img" aria-label="최근 6개월 수입·지출 추이">
        <line
          x1={PAD_L}
          y1={HEIGHT - PAD_BOTTOM}
          x2={WIDTH - PAD_R}
          y2={HEIGHT - PAD_BOTTOM}
          className="stroke-border"
          strokeWidth={1}
        />

        <polyline
          points={toPoints(incomePoints, max)}
          fill="none"
          className="stroke-income"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={toPoints(expensePoints, max)}
          fill="none"
          className="stroke-expense"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={scaleX(i, points.length)} cy={scaleY(p.income, max)} r={3.5} className="fill-income" />
            <circle cx={scaleX(i, points.length)} cy={scaleY(p.expense, max)} r={3.5} className="fill-expense" />
            <text
              x={scaleX(i, points.length)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-ink-secondary text-[11px]"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
