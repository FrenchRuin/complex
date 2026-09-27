import { describe, expect, it } from "vitest";
import { categoryInputSchema, displayNameSchema, paymentMethodInputSchema } from "./schemas";

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
