"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CompositionPart } from "@/lib/calc/assets";
import { formatWon, formatWonTiny } from "@/lib/money";

/** 차트 색은 토큰으로만 (chart-1~7 = 예금·적금·투자·보증금·부동산·자동차·기타) */
const SLOT_FILL = (slot: number) => `var(--chart-${slot})`;
const SLOT_DOT: Record<number, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
  6: "bg-chart-6",
  7: "bg-chart-7",
};

/**
 * 자산 구성 도넛 (F-40). 부채는 빼고 종류별 비율.
 * 조각 사이 2px 틈, 12시부터 시계 방향. 색만으로 구분하지 않게 옆 목록에 이름·금액·비율을 글자로 둔다 (화면 읽기는 목록을 읽는다).
 */
export function AssetCompositionChart({ parts }: { parts: CompositionPart[] }) {
  if (parts.length === 0) {
    return <p className="py-6 text-center text-body text-ink-muted">자산을 추가하면 종류별 비율이 보여요.</p>;
  }
  const total = parts.reduce((s, p) => s + p.amount, 0);

  return (
    <figure className="@container">
      <div className="flex flex-col items-center gap-5 @sm:flex-row @sm:gap-4">
        <div className="relative size-44 shrink-0 @sm:size-36" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={parts}
                dataKey="amount"
                nameKey="label"
                innerRadius="62%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--surface-raised)"
                strokeWidth={parts.length > 1 ? 2 : 0}
                isAnimationActive={false}
              >
                {parts.map((p) => (
                  <Cell key={p.kind} fill={SLOT_FILL(p.slot)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as CompositionPart | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="rounded-sm bg-surface-raised px-3 py-2 text-caption text-ink shadow-float tabular-nums">
                      <p className="font-semibold">{p.label}</p>
                      <p>
                        {formatWon(p.amount)} · {p.percent}%
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* 가운데: 자산 합계 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-caption text-ink-muted">자산</span>
            <span className="text-amount text-ink tabular-nums">{formatWonTiny(total)}</span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 divide-y divide-line">
          {parts.map((p) => (
            <li key={p.kind} className="flex items-center gap-2 py-2 text-body tabular-nums">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${SLOT_DOT[p.slot]}`} />
              <span className="shrink-0 text-ink">{p.label}</span>
              <span className="min-w-0 flex-1 text-right text-ink">{formatWon(p.amount)}</span>
              <span className="w-10 shrink-0 text-right text-ink-muted">{p.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="sr-only">자산 종류별 비율</figcaption>
    </figure>
  );
}
