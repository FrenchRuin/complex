import { todayKST, type DateString } from "./date";
import { toSlot, type Slot } from "./domain";
import { createClient } from "./supabase/server";

export type SettlementRecord = {
  id: string;
  periodEnd: DateString;
  from: Slot | null;
  to: Slot | null;
  amount: number;
  paidA: number;
  paidB: number;
  createdAt: string;
};

export type SettlementOverview = {
  /** 이번 정산 대상 시작일 (마지막 정산 다음 날). 정산한 적이 없으면 null = 처음부터 */
  start: DateString | null;
  end: DateString;
  paidA: number;
  paidB: number;
  shareA: number;
  history: SettlementRecord[];
};

function nextDay(date: DateString): DateString {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** 정산 화면 데이터 (F-24). 금액 확정은 DB 함수 record_settlement가 다시 계산한다 */
export async function getSettlementOverview(householdId: string): Promise<SettlementOverview> {
  const supabase = await createClient();
  const today = todayKST();

  const [householdRes, historyRes] = await Promise.all([
    supabase.from("households").select("settlement_share_a").eq("id", householdId).single(),
    supabase
      .from("settlements")
      .select("id, period_end, from_slot, to_slot, amount, paid_a, paid_b, created_at")
      .order("period_end", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (householdRes.error) throw new Error(`정산 정보를 불러오지 못했어요: ${householdRes.error.message}`);
  if (historyRes.error) throw new Error(`정산 기록을 불러오지 못했어요: ${historyRes.error.message}`);

  const history = historyRes.data.map((s) => ({
    id: s.id,
    periodEnd: s.period_end,
    from: s.from_slot ? toSlot(s.from_slot) : null,
    to: s.to_slot ? toSlot(s.to_slot) : null,
    amount: s.amount,
    paidA: s.paid_a,
    paidB: s.paid_b,
    createdAt: s.created_at,
  }));
  const start = history[0] ? nextDay(history[0].periodEnd) : null;

  let query = supabase
    .from("transactions")
    .select("amount, member_slot")
    .is("deleted_at", null)
    .eq("type", "expense")
    .eq("scope", "joint")
    .lte("occurred_on", today);
  if (start) query = query.gte("occurred_on", start);
  const { data, error } = await query;
  if (error) throw new Error(`공동 지출을 불러오지 못했어요: ${error.message}`);

  return {
    start,
    end: today,
    paidA: data.filter((r) => r.member_slot === "a").reduce((s, r) => s + r.amount, 0),
    paidB: data.filter((r) => r.member_slot === "b").reduce((s, r) => s + r.amount, 0),
    shareA: householdRes.data.settlement_share_a,
    history,
  };
}
