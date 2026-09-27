/**
 * 이미 있는 내역 같은지 (F-15 중복 경고).
 * 같은 금액 + 같은 가맹점(공백·대소문자 무시) + 날짜 ±1일
 */
import type { DateString } from "@/lib/date";
import { normalizeMerchant } from "./merchant";

type Candidate = { date: DateString; amount: number; merchant: string | null };
type Existing = { occurredOn: DateString; amount: number; merchant: string | null };

function dayDistance(a: DateString, b: DateString): number {
  const utc = (d: DateString) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.abs(Math.round((utc(a) - utc(b)) / 86_400_000));
}

export function isLikelyDuplicate(candidate: Candidate, existing: readonly Existing[]): boolean {
  const key = normalizeMerchant(candidate.merchant);
  return existing.some(
    (row) =>
      row.amount === candidate.amount &&
      normalizeMerchant(row.merchant) === key &&
      dayDistance(row.occurredOn, candidate.date) <= 1,
  );
}
