import type { MemberNames, Slot } from "@/lib/domain";
import type { HouseholdMember } from "@/lib/household";
import type { CategoryOption, PaymentMethodOption } from "@/lib/household-data";

export type { TransactionRecord } from "@/lib/transactions";

/** 패널이 쓰는 가구 데이터 (레이아웃에서 한 번 읽어 넘긴다) */
export type PanelData = {
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
  members: HouseholdMember[];
  names: MemberNames;
  mySlot: Slot;
  /** 가맹점 규칙 (카테고리 자동 추천) */
  rules: Record<string, string>;
};
