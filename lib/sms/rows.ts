/**
 * 인식한 문자 → 미리보기 행 (F-15). 기본값을 채운다:
 * 결제수단(별칭) → 구분·사람, 카테고리(규칙 → 사전 → 기타), 취소 문자는 환불(수입).
 */
import { defaultAssignment } from "@/lib/calc/assignment";
import { fallbackCategory, suggestCategory } from "@/lib/calc/merchant";
import type { DateString } from "@/lib/date";
import type { CategoryType, Owner, Scope, Slot } from "@/lib/domain";
import { matchPaymentMethod } from "./match";
import type { ParsedSms } from "./parse";

export type SmsRow = {
  key: string;
  raw: string;
  selected: boolean;
  duplicate: boolean;
  isCancel: boolean;
  /** 별칭으로 결제수단을 못 찾았을 때 보여줄 카드사 추정 */
  cardHint: string | null;
  type: CategoryType;
  amount: number;
  date: DateString;
  time: string | null;
  merchant: string;
  categoryId: string | null;
  paymentMethodId: string | null;
  scope: Scope;
  memberSlot: Slot;
};

type Context = {
  mySlot: Slot;
  methods: { id: string; owner: Owner; smsAliases: string[] }[];
  categories: { id: string; name: string; type: CategoryType }[];
  rules: Record<string, string>;
};

function refundCategory(categories: Context["categories"]): string | null {
  return (
    categories.find((c) => c.type === "income" && c.name === "환불")?.id ?? fallbackCategory("income", categories)
  );
}

export function buildSmsRows(parsed: readonly ParsedSms[], ctx: Context): SmsRow[] {
  return parsed.map((sms, index) => {
    const paymentMethodId = matchPaymentMethod(sms.raw, ctx.methods);
    const owner = ctx.methods.find((m) => m.id === paymentMethodId)?.owner ?? null;
    const type: CategoryType = sms.isCancel ? "income" : sms.type;
    const merchant = sms.merchant ?? "";
    const categoryId = sms.isCancel
      ? refundCategory(ctx.categories)
      : (suggestCategory(merchant, type, ctx.rules, ctx.categories) ?? fallbackCategory(type, ctx.categories));

    return {
      key: `${index}-${sms.date}-${sms.amount}`,
      raw: sms.raw,
      selected: !sms.isCancel,
      duplicate: false,
      isCancel: sms.isCancel,
      cardHint: paymentMethodId ? null : sms.cardHint,
      type,
      amount: sms.amount,
      date: sms.date,
      time: sms.time,
      merchant,
      categoryId,
      paymentMethodId,
      ...defaultAssignment(owner, ctx.mySlot),
    };
  });
}

/** 중복 판단 결과를 반영한다. 중복이면 기본 선택 해제 */
export function markDuplicates(rows: readonly SmsRow[], duplicates: readonly boolean[]): SmsRow[] {
  return rows.map((row, i) =>
    duplicates[i] ? { ...row, duplicate: true, selected: false } : row,
  );
}
