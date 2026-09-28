import { cache } from "react";
import {
  dueDate,
  dueUnpaidCount,
  isActiveInMonth,
  recurringStatus,
  summarize,
  type RecurringStatus,
  type RecurringSummary,
} from "./calc/recurring";
import { currentMonthKST, todayKST, type DateString, type MonthString } from "./date";
import { toScope, toSlot, type Scope, type Slot } from "./domain";
import { createClient } from "./supabase/server";

export type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  scope: Scope;
  memberSlot: Slot;
  paymentMethodId: string | null;
  isVariable: boolean;
  hasVariableDate: boolean;
  startMonth: DateString;
  endMonth: DateString | null;
};

export type MonthlyRecurring = {
  item: RecurringItem;
  due: DateString;
  status: RecurringStatus;
  /** 이번 달 낸 금액 (안 냈으면 null) */
  paidAmount: number | null;
  /** 안 냈을 때 기본 금액: 금액이 매달 다르면 지난 납부 금액, 아니면 등록 금액 */
  expectedAmount: number;
};

export type RecurringOverview = {
  month: MonthString;
  rows: MonthlyRecurring[];
  summary: RecurringSummary;
  dueUnpaid: number;
  /** 관리 화면용 전체 목록 (중지 포함) */
  items: RecurringItem[];
};

/** 이번 달 정기지출 현황. 레이아웃(배지)·홈·정기지출 화면이 같이 쓴다. */
export const getRecurringOverview = cache(async (): Promise<RecurringOverview> => {
  const month = currentMonthKST();
  const today = todayKST();
  const monthFirst = `${month}-01`;
  const supabase = await createClient();

  const [itemsRes, paidRes] = await Promise.all([
    supabase
      .from("recurring_items")
      .select(
        "id, name, amount, day_of_month, category_id, scope, member_slot, payment_method_id, is_variable, has_variable_date, start_month, end_month",
      )
      .order("day_of_month")
      .order("created_at"),
    supabase
      .from("transactions")
      .select("recurring_item_id, recurring_month, amount")
      .not("recurring_item_id", "is", null)
      .is("deleted_at", null)
      .lte("recurring_month", monthFirst)
      .order("recurring_month", { ascending: false }),
  ]);
  if (itemsRes.error) throw new Error(`정기지출을 불러오지 못했어요: ${itemsRes.error.message}`);
  if (paidRes.error) throw new Error(`정기지출 납부 기록을 불러오지 못했어요: ${paidRes.error.message}`);

  const items: RecurringItem[] = itemsRes.data.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    dayOfMonth: r.day_of_month,
    categoryId: r.category_id,
    scope: toScope(r.scope),
    memberSlot: toSlot(r.member_slot),
    paymentMethodId: r.payment_method_id,
    isVariable: r.is_variable,
    hasVariableDate: r.has_variable_date,
    startMonth: r.start_month,
    endMonth: r.end_month,
  }));

  const rows = items
    .filter((item) => isActiveInMonth(item, month))
    .map((item): MonthlyRecurring => {
      const payments = paidRes.data.filter((p) => p.recurring_item_id === item.id);
      const thisMonth = payments.find((p) => p.recurring_month === monthFirst);
      const previous = payments.find((p) => p.recurring_month !== monthFirst);
      const due = dueDate(month, item.dayOfMonth);
      return {
        item,
        due,
        status: recurringStatus(due, today, Boolean(thisMonth)),
        paidAmount: thisMonth?.amount ?? null,
        expectedAmount: item.isVariable ? (previous?.amount ?? item.amount) : item.amount,
      };
    })
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));

  return {
    month,
    rows,
    summary: summarize(rows),
    dueUnpaid: dueUnpaidCount(rows.map((r) => r.status)),
    items,
  };
});
