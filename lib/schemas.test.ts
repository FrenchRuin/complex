import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  displayNameSchema,
  transactionInputSchema,
} from "./schemas";

describe("displayNameSchema", () => {
  it("앞뒤 공백을 지운다", () => {
    expect(displayNameSchema.parse("  지훈 ")).toBe("지훈");
  });

  it("비었거나 10자를 넘으면 오류", () => {
    expect(displayNameSchema.safeParse("   ").error?.issues[0]?.message).toBe(
      "표시 이름을 입력해 주세요",
    );
    expect(displayNameSchema.safeParse("가나다라마바사아자차카").success).toBe(false);
    expect(displayNameSchema.safeParse("가나다라마바사아자차").success).toBe(true);
  });
});

describe("categoryInputSchema", () => {
  it("목록에 없는 아이콘은 거부한다", () => {
    expect(
      categoryInputSchema.safeParse({ type: "expense", name: "간식", icon: "rocket" }).success,
    ).toBe(false);
    expect(
      categoryInputSchema.safeParse({ type: "expense", name: "간식", icon: "coffee" }).success,
    ).toBe(true);
  });
});

describe("transactionInputSchema", () => {
  const base = {
    type: "expense",
    amount: 12000,
    occurredOn: "2026-09-27",
    categoryId: "7b6c0a1e-4a4f-4b8e-9d7a-2f1d3c5b6a70",
    merchant: " 다이소 ",
    memo: "",
    assetId: "11111111-1111-4111-8111-111111111111",
    toAssetId: null,
    scope: "joint",
    memberSlot: "a",
  } as const;

  it("가맹점 공백을 지우고 빈 메모는 null", () => {
    const parsed = transactionInputSchema.parse(base);
    expect(parsed.merchant).toBe("다이소");
    expect(parsed.memo).toBeNull();
  });

  it("금액은 1원 이상 정수", () => {
    expect(transactionInputSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...base, amount: 1.5 }).success).toBe(false);
  });

  it("없는 날짜는 거부한다", () => {
    expect(transactionInputSchema.safeParse({ ...base, occurredOn: "2026-02-30" }).success).toBe(
      false,
    );
    expect(transactionInputSchema.safeParse({ ...base, occurredOn: "2028-02-29" }).success).toBe(
      true,
    );
  });

  it("카테고리가 없으면 안내 문구", () => {
    const result = transactionInputSchema.safeParse({ ...base, categoryId: "" });
    expect(result.error?.issues[0]?.message).toBe("카테고리를 골라 주세요");
  });
});

const ASSET_A = "11111111-1111-4111-8111-111111111111";
const ASSET_B = "22222222-2222-4222-8222-222222222222";
const CATEGORY = "33333333-3333-4333-8333-333333333333";
const TX_ID = "44444444-4444-4444-8444-444444444444";
const txBase = {
  amount: 12_000, occurredOn: "2026-10-25", merchant: "", memo: "", scope: "joint", memberSlot: "a",
} as const;

describe("transactionInputSchema: 자산·이체", () => {
  it("새 지출은 자산이 있어야 한다", () => {
    const r = transactionInputSchema.safeParse({ ...txBase, type: "expense", categoryId: CATEGORY, assetId: null, toAssetId: null });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("자산을 골라 주세요");
  });
  it("예전 내역 고치기(id 있음)는 자산 없이도 된다", () => {
    const r = transactionInputSchema.safeParse({ ...txBase, id: TX_ID, type: "expense", categoryId: CATEGORY, assetId: null, toAssetId: null });
    expect(r.success).toBe(true);
  });
  it("지출·수입은 카테고리가 있어야 하고, 받는 자산은 지운다", () => {
    expect(
      transactionInputSchema.safeParse({ ...txBase, type: "income", categoryId: null, assetId: ASSET_A, toAssetId: null }).error?.issues[0].message,
    ).toBe("카테고리를 골라 주세요");
    const ok = transactionInputSchema.parse({ ...txBase, type: "income", categoryId: CATEGORY, assetId: ASSET_A, toAssetId: ASSET_B });
    expect(ok.toAssetId).toBeNull();
  });
  it("이체는 보내는·받는 자산이 다르게 있어야 하고, 카테고리·가맹점은 지운다", () => {
    const t = { ...txBase, type: "transfer", categoryId: CATEGORY, merchant: "무시", assetId: ASSET_A, toAssetId: ASSET_B } as const;
    const ok = transactionInputSchema.parse(t);
    expect(ok.categoryId).toBeNull();
    expect(ok.merchant).toBeNull();
    expect(transactionInputSchema.safeParse({ ...t, assetId: null }).error?.issues[0].message).toBe("보내는 자산을 골라 주세요");
    expect(transactionInputSchema.safeParse({ ...t, toAssetId: null }).error?.issues[0].message).toBe("받는 자산을 골라 주세요");
    expect(transactionInputSchema.safeParse({ ...t, toAssetId: ASSET_A }).error?.issues[0].message).toBe(
      "보내는 자산과 받는 자산이 같아요. 다른 자산을 골라 주세요",
    );
  });
});
