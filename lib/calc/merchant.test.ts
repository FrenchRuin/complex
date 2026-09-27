import { describe, expect, it } from "vitest";
import { fallbackCategory, normalizeMerchant, suggestCategory } from "./merchant";

const categories = [
  { id: "cafe", name: "카페·간식", type: "expense" },
  { id: "delivery", name: "배달", type: "expense" },
  { id: "mart", name: "생활·마트", type: "expense" },
  { id: "shopping", name: "쇼핑", type: "expense" },
  { id: "food", name: "식비", type: "expense" },
  { id: "etc", name: "기타", type: "expense" },
  { id: "refund", name: "환불", type: "income" },
  { id: "etc-in", name: "기타수입", type: "income" },
] as const;

describe("normalizeMerchant", () => {
  it("공백을 지우고 소문자로", () => {
    expect(normalizeMerchant(" 스타벅스 강남점 ")).toBe("스타벅스강남점");
    expect(normalizeMerchant("GS25 역삼")).toBe("gs25역삼");
    expect(normalizeMerchant(null)).toBe("");
  });
});

describe("suggestCategory", () => {
  it("기억한 규칙이 먼저", () => {
    expect(suggestCategory("스타벅스 강남점", "expense", { 스타벅스강남점: "food" }, categories)).toBe("food");
  });

  it("규칙이 없으면 키워드 사전", () => {
    expect(suggestCategory("스타벅스 강남점", "expense", {}, categories)).toBe("cafe");
    expect(suggestCategory("GS25 역삼점", "expense", {}, categories)).toBe("mart");
  });

  it("더 긴 키워드가 이긴다 (쿠팡이츠는 배달, 쿠팡은 쇼핑)", () => {
    expect(suggestCategory("쿠팡이츠", "expense", {}, categories)).toBe("delivery");
    expect(suggestCategory("쿠팡", "expense", {}, categories)).toBe("shopping");
  });

  it("짧은 영문 키워드는 다른 단어 안에서 걸리지 않는다", () => {
    expect(suggestCategory("CU 역삼점", "expense", {}, categories)).toBe("mart");
    expect(suggestCategory("Cucumber shop", "expense", {}, categories)).toBeNull();
  });

  it("유형이 다르거나 없는 카테고리 규칙은 무시", () => {
    expect(suggestCategory("스타벅스", "income", { 스타벅스: "cafe" }, categories)).toBeNull();
    expect(suggestCategory("스타벅스", "expense", { 스타벅스: "hidden" }, categories)).toBe("cafe");
  });

  it("아무것도 없으면 null", () => {
    expect(suggestCategory("동네 꽃집", "expense", {}, categories)).toBeNull();
    expect(suggestCategory("  ", "expense", {}, categories)).toBeNull();
  });
});

describe("fallbackCategory", () => {
  it("지출은 기타, 수입은 기타수입", () => {
    expect(fallbackCategory("expense", categories)).toBe("etc");
    expect(fallbackCategory("income", categories)).toBe("etc-in");
  });
});
