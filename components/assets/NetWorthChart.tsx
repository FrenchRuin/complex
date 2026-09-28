"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/calc/assets";
import { formatMonthLabel } from "@/lib/date";
import { formatWon, formatWonShort } from "@/lib/money";

const shortMonth = (month: string) => `${Number(month.slice(5, 7))}월`;

/**
 * 순자산 추이 (F-41). 값 하나라 primary 한 색, 범례 없음. 이번 달은 "지금"으로 옅게.
 * 점이 1개(이번 달)뿐이면 그래프 대신 안내를 보여준다. "표로 보기"로 숫자도 제공.
 */
export function NetWorthChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-body text-ink-muted">
        지난달 이전 날짜로 금액 기록을 넣으면 추이가 보여요.
      </p>
    );
  }

  return (
    <figure>
      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <ReferenceLine y={0} stroke="var(--line-strong)" />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string, i: number) => (points[i]?.current ? "지금" : shortMonth(m))}
              tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => (v === 0 ? "0" : `${v < 0 ? "-" : ""}${formatWonShort(Math.abs(v))}`)}
              tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-sunken)" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as TrendPoint | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-sm bg-surface-raised px-3 py-2 text-caption text-ink shadow-float tabular-nums">
                    <p className="font-semibold">{p.current ? "지금" : `${formatMonthLabel(p.month)} 말`}</p>
                    <p>{formatWon(p.net)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {points.map((p) => (
                <Cell key={p.month} fill="var(--primary)" fillOpacity={p.current ? 0.45 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2">
        <summary className="text-caption text-ink-muted hover:text-ink">표로 보기</summary>
        <table className="mt-2 w-full text-body tabular-nums">
          <caption className="sr-only">순자산 추이</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.month} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-1 text-left font-normal text-ink-muted">
                  {p.current ? "지금" : `${formatMonthLabel(p.month)} 말`}
                </th>
                <td className="py-1 text-right text-ink">{formatWon(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
