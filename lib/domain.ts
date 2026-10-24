/**
 * 도메인 값과 화면 라벨. DB에는 text로 저장되므로 읽을 때 이 타입으로 좁힌다.
 */

export const SLOTS = ["a", "b"] as const;
export type Slot = (typeof SLOTS)[number];

export const OWNERS = ["joint", "a", "b"] as const;
export type Owner = (typeof OWNERS)[number];

export const CATEGORY_TYPES = ["expense", "income"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

/** 내역 유형. 카테고리 종류(CategoryType)는 지출·수입뿐이고, 이체는 카테고리가 없다 */
export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  expense: "지출",
  income: "수입",
  transfer: "이체",
};

export function toTransactionType(value: string): TransactionType {
  return value === "income" || value === "transfer" ? value : "expense";
}

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

export function toSlot(value: string): Slot {
  return value === "b" ? "b" : "a";
}

export function toOwner(value: string): Owner {
  return value === "a" || value === "b" ? value : "joint";
}

export type MemberNames = Record<Slot, string | null>;

/** 소유자 표시 이름. 공동은 "공동", 아직 없는 사람은 "A"/"B" */
export function ownerLabel(owner: Owner, names: MemberNames): string {
  if (owner === "joint") return "공동";
  return names[owner] ?? owner.toUpperCase();
}
