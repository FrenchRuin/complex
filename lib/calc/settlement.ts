/**
 * 공동 지출 정산 (F-24). DB 함수 record_settlement와 같은 계산.
 * A가 부담할 몫 = (Pa + Pb) × shareA%. A가 더 냈으면 B → A, 덜 냈으면 A → B. 원 미만 버림.
 * 50:50이면 (Pa − Pb) / 2 와 같다.
 */
import type { Slot } from "@/lib/domain";
import { formatWon } from "@/lib/money";

export type Transfer = { from: Slot; to: Slot; amount: number } | null;

export function settle(paidA: number, paidB: number, shareA = 50): Transfer {
  const excess = paidA - ((paidA + paidB) * shareA) / 100;
  const amount = Math.floor(Math.abs(excess));
  if (amount === 0) return null;
  return excess > 0 ? { from: "b", to: "a", amount } : { from: "a", to: "b", amount };
}

/** 공동 지출 중 A가 낸 비율(%) — 결제 비율 막대용 */
export function paidShareA(paidA: number, paidB: number): number {
  const total = paidA + paidB;
  return total === 0 ? 0 : Math.round((paidA / total) * 100);
}

/** "반반으로 나누면 서연 → 지훈 128,500원이에요" */
export function settlementSentence(transfer: Transfer, names: Record<Slot, string>, shareA = 50): string {
  const how = shareA === 50 ? "반반으로 나누면" : `${shareA}:${100 - shareA}로 나누면`;
  if (!transfer) return `${how} 서로 보낼 돈이 없어요`;
  return `${how} ${names[transfer.from]} → ${names[transfer.to]} ${formatWon(transfer.amount)}이에요`;
}
