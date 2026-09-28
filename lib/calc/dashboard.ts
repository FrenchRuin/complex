/**
 * 홈 대시보드 계산 (F-20, F-14, SPEC §6).
 */
import type { DateString } from "@/lib/date";
import type { CategoryType, Scope, Slot } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { PersonFilter } from "./filters";

type PersonRow = { scope: Scope; memberSlot: Slot };

/** 사람 필터: 공동 = 공동 내역 전체, A = A의 개인 내역만 (SPEC §6) */
export function matchesPerson(row: PersonRow, who: PersonFilter): boolean {
  if (who === "all") return true;
  if (who === "joint") return row.scope === "joint";
  return row.scope === "personal" && row.memberSlot === who;
}

export type Split = { joint: number; a: number; b: number };

/** 지출을 공동 / A 개인 / B 개인으로 나눈 합계 */
export function splitByOwner(rows: readonly (PersonRow & { type: CategoryType; amount: number })[]): Split {
  const split: Split = { joint: 0, a: 0, b: 0 };
  for (const row of rows) {
    if (row.type !== "expense") continue;
    split[row.scope === "joint" ? "joint" : row.memberSlot] += row.amount;
  }
  return split;
}

/**
 * 분할 막대 비율(%). 반올림 후 합이 100이 되도록 가장 큰 값에서 보정한다 (SPEC §6).
 * 모두 0이면 모두 0.
 */
export function splitPercents(split: Split): Split {
  const total = split.joint + split.a + split.b;
  if (total === 0) return { joint: 0, a: 0, b: 0 };

  const keys = ["joint", "a", "b"] as const;
  const rounded: Split = {
    joint: Math.round((split.joint / total) * 100),
    a: Math.round((split.a / total) * 100),
    b: Math.round((split.b / total) * 100),
  };
  const diff = 100 - (rounded.joint + rounded.a + rounded.b);
  const largest = keys.reduce((max, key) => (split[key] > split[max] ? key : max), keys[0]);
  rounded[largest] += diff;
  return rounded;
}

/** "지난달 같은 기간보다 ○원 적게/많이 썼어요" */
export function compareWithLastMonth(thisMonth: number, lastMonth: number): string {
  const diff = thisMonth - lastMonth;
  if (diff === 0) return "지난달 같은 기간과 똑같이 썼어요";
  return `지난달 같은 기간보다 ${formatWon(Math.abs(diff))} ${diff < 0 ? "적게" : "많이"} 썼어요`;
}

function dayDiff(from: DateString, to: DateString): number {
  const utc = (d: DateString) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** 오늘 / 어제 / 3일 전 / 9월 2일 */
export function relativeDayLabel(date: DateString, today: DateString): string {
  const days = dayDiff(date, today);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}
