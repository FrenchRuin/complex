"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonthLabel, type MonthString } from "@/lib/date";
import { formatWon, formatWonShort } from "@/lib/money";

type Props = {
  data: { month: MonthString; expense: number }[];
  /** 진행 중인 달 (이번 달) */
  currentMonth: MonthString;
};

const shortMonth = (month: MonthString) => `${Number(month.slice(5, 7))}월`;

/**
 * 최근 6개월 지출 (F-23). 한 가지 값이라 색 하나(primary), 범례 없음.
 * 이번 달은 옅게 칠하고 "진행 중"을 글자로 표시한다. 아래 "표로 보기"로 숫자를 글자로도 제공한다.
 */
export function MonthlyChart({ data, currentMonth }: Props) {
  return (
    <figure>
      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="month"
              tickFormatter={(m: MonthString) => (m === currentMonth ? `${shortMonth(m)}·진행 중` : shortMonth(m))}
              tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => (v === 0 ? "0" : formatWonShort(v))}
              tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-sunken)" }}
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as { month: MonthString; expense: number } | undefined;
                if (!active || !item) return null;
                return (
                  <div className="rounded-sm bg-surface-raised px-3 py-2 text-caption text-ink shadow-float tabular-nums">
                    <p className="font-semibold">
                      {formatMonthLabel(item.month)}
                      {item.month === currentMonth ? " (진행 중)" : ""}
                    </p>
                    <p>{formatWon(item.expense)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="expense" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.month} fill="var(--primary)" fillOpacity={d.month === currentMonth ? 0.45 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2">
        <summary className="text-caption text-ink-muted hover:text-ink">표로 보기</summary>
        <table className="mt-2 w-full text-body tabular-nums">
          <caption className="sr-only">최근 6개월 지출</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-1 text-left font-normal text-ink-muted">
                  {formatMonthLabel(d.month)}
                  {d.month === currentMonth ? " (진행 중)" : ""}
                </th>
                <td className="py-1 text-right text-ink">{formatWon(d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
