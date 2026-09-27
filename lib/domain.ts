/**
 * 도메인 값과 화면 라벨. DB에는 text로 저장되므로 읽을 때 이 타입으로 좁힌다.
 */

export const SLOTS = ["a", "b"] as const;
export type Slot = (typeof SLOTS)[number];

export const OWNERS = ["joint", "a", "b"] as const;
export type Owner = (typeof OWNERS)[number];

export const CATEGORY_TYPES = ["expense", "income"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const PAYMENT_KINDS = ["card", "account", "cash", "other"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const SCOPES = ["joint", "personal"] as const;
export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABEL: Record<Scope, string> = { joint: "공동", personal: "개인" };

export function toScope(value: string): Scope {
  return value === "joint" ? "joint" : "personal";
}

export function toCategoryType(value: string): CategoryType {
  return value === "income" ? "income" : "expense";
}

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  expense: "지출",
  income: "수입",
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  card: "카드",
  account: "계좌",
  cash: "현금",
  other: "기타",
};

export function toSlot(value: string): Slot {
  return value === "b" ? "b" : "a";
}

export function toOwner(value: string): Owner {
  return value === "a" || value === "b" ? value : "joint";
}

export function toPaymentKind(value: string): PaymentKind {
  return (PAYMENT_KINDS as readonly string[]).includes(value) ? (value as PaymentKind) : "other";
}

export type MemberNames = Record<Slot, string | null>;

/** 소유자 표시 이름. 공동은 "공동", 아직 없는 사람은 "A"/"B" */
export function ownerLabel(owner: Owner, names: MemberNames): string {
  if (owner === "joint") return "공동";
  return names[owner] ?? owner.toUpperCase();
}
