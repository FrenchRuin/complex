import { describe, expect, it } from "vitest";
import { isLikelyDuplicate } from "@/lib/calc/duplicates";
import { matchPaymentMethod } from "./match";

describe("matchPaymentMethod", () => {
  const methods = [
    { id: "family", smsAliases: ["신한"] },
    { id: "seoyeon", smsAliases: ["신한카드(5678)", "삼성카드"] },
    { id: "cash", smsAliases: [] },
  ];

  it("별칭이 들어 있으면 그 결제수단", () => {
    expect(matchPaymentMethod("삼성카드 승인 1,000원", methods)).toBe("seoyeon");
  });

  it("여러 개 맞으면 가장 긴 별칭 (공백 무시)", () => {
    expect(matchPaymentMethod("신한카드 (5678) 승인", methods)).toBe("seoyeon");
    expect(matchPaymentMethod("신한카드(1234) 승인", methods)).toBe("family");
  });

  it("없으면 null", () => {
    expect(matchPaymentMethod("현대카드 승인", methods)).toBeNull();
  });
});

describe("isLikelyDuplicate", () => {
  const existing = [{ occurredOn: "2026-09-26", amount: 12000, merchant: "다이소 강남점" }];

  it("같은 금액·가맹점(공백·대소문자 무시), 날짜 ±1일이면 중복", () => {
    expect(isLikelyDuplicate({ date: "2026-09-27", amount: 12000, merchant: "다이소강남점" }, existing)).toBe(true);
    expect(isLikelyDuplicate({ date: "2026-09-25", amount: 12000, merchant: "다이소 강남점" }, existing)).toBe(true);
  });

  it("2일 이상 차이, 다른 금액, 다른 가맹점이면 아님", () => {
    expect(isLikelyDuplicate({ date: "2026-09-28", amount: 12000, merchant: "다이소 강남점" }, existing)).toBe(false);
    expect(isLikelyDuplicate({ date: "2026-09-26", amount: 12001, merchant: "다이소 강남점" }, existing)).toBe(false);
    expect(isLikelyDuplicate({ date: "2026-09-26", amount: 12000, merchant: "다이소 역삼점" }, existing)).toBe(false);
  });
});
