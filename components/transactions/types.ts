import type { CategoryType, MemberNames, Scope, Slot } from "@/lib/domain";
import type { CategoryOption, PaymentMethodOption } from "@/lib/household-data";
import type { HouseholdMember } from "@/lib/household";

/** 편집 패널에 넘기는 내역 한 건 */
export type TransactionRecord = {
  id: string;
  type: CategoryType;
  amount: number;
  occurredOn: string;
  categoryId: string;
  merchant: string | null;
  memo: string | null;
  paymentMethodId: string | null;
  scope: Scope;
  memberSlot: Slot;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

/** 패널이 쓰는 가구 데이터 (레이아웃에서 한 번 읽어 넘긴다) */
export type PanelData = {
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
  members: HouseholdMember[];
  names: MemberNames;
  mySlot: Slot;
};
