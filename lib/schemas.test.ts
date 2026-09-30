import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  displayNameSchema,
  loanDebtSchema,
  loanProfileSchema,
  loanScenarioSchema,
  paymentMethodInputSchema,
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
    paymentMethodId: null,
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

describe("paymentMethodInputSchema", () => {
  it("별칭을 쉼표로 나눈다", () => {
    const parsed = paymentMethodInputSchema.parse({
      name: " 가족카드 ",
      kind: "card",
      owner: "joint",
      smsAliases: "신한, 신한카드 , ,",
    });
    expect(parsed).toEqual({
      name: "가족카드",
      kind: "card",
      owner: "joint",
      smsAliases: ["신한", "신한카드"],
    });
  });

  it("별칭이 비어 있으면 빈 목록", () => {
    const parsed = paymentMethodInputSchema.parse({
      name: "현금",
      kind: "cash",
      owner: "a",
      smsAliases: "",
    });
    expect(parsed.smsAliases).toEqual([]);
  });


  it("잘못된 소유는 거부한다", () => {
    expect(
      paymentMethodInputSchema.safeParse({ name: "x", kind: "card", owner: "c", smsAliases: "" })
        .success,
    ).toBe(false);
  });
});

describe("대출 입력 (F-43)", () => {
  it("1주택이면 생애최초는 꺼진다", () => {
    const r = loanProfileSchema.parse({ incomeA: 1, incomeB: 0, homeStatus: "one", firstTime: true });
    expect(r.firstTime).toBe(false);
  });
  it("주담대·자동차·기타는 남은 기간이나 매달 금액이 있어야 한다", () => {
    const base = { name: "차", kind: "car", owner: "joint", balance: 1_000_000, rateBp: 500, monthsLeft: null, monthlyPayment: null };
    const r = loanDebtSchema.safeParse(base);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("남은 기간이나 매달 내는 금액 중 하나를 입력해 주세요");
    expect(loanDebtSchema.safeParse({ ...base, monthsLeft: 36 }).success).toBe(true);
    expect(loanDebtSchema.safeParse({ ...base, kind: "credit" }).success).toBe(true);
  });
  it("후보: 가격은 1원 이상, 만기는 30년까지, 메모 500자", () => {
    const base = { name: "마포", deal: "buy", price: 1, region: "metro", rateBp: null, termYears: null, extraCosts: 0, memo: "" };
    expect(loanScenarioSchema.safeParse(base).success).toBe(true);
    expect(loanScenarioSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
    expect(loanScenarioSchema.safeParse({ ...base, termYears: 31 }).success).toBe(false);
    expect(loanScenarioSchema.safeParse({ ...base, memo: "가".repeat(501) }).success).toBe(false);
  });
});
