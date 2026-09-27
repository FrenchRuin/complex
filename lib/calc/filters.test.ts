import { describe, expect, it } from "vitest";
import { activeFilterCount, filtersToHref, parseFilters, sanitizeSearch } from "./filters";

const ID1 = "7b6c0a1e-4a4f-4b8e-9d7a-2f1d3c5b6a70";
const ID2 = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";

describe("parseFilters", () => {
  it("비어 있으면 기본값", () => {
    expect(parseFilters({}, "2026-09")).toEqual({
      month: "2026-09",
      who: "all",
      type: "all",
      categories: [],
      paymentMethods: [],
      q: "",
      day: null,
    });
  });

  it("잘못된 값은 기본값으로", () => {
    const f = parseFilters(
      { month: "2026-13", who: "c", type: "x", cat: "abc", day: "2026-09-40" },
      "2026-09",
    );
    expect(f.month).toBe("2026-09");
    expect(f.who).toBe("all");
    expect(f.type).toBe("all");
    expect(f.categories).toEqual([]);
    expect(f.day).toBeNull();
  });

  it("쉼표로 여러 id를 받고 중복은 뺀다", () => {
    expect(parseFilters({ cat: `${ID1},${ID2},${ID1}` }, "2026-09").categories).toEqual([ID1, ID2]);
  });

  it("다른 달의 날짜는 무시한다", () => {
    expect(parseFilters({ month: "2026-08", day: "2026-09-01" }, "2026-09").day).toBeNull();
    expect(parseFilters({ month: "2026-08", day: "2026-08-31" }, "2026-09").day).toBe("2026-08-31");
  });
});

describe("filtersToHref", () => {
  const base = parseFilters({}, "2026-09");

  it("기본값은 주소에 쓰지 않는다", () => {
    expect(filtersToHref(base, "2026-09")).toBe("/transactions");
  });

  it("바꾼 값만 쓴다", () => {
    expect(filtersToHref(base, "2026-09", { who: "a", month: "2026-08" })).toBe(
      "/transactions?month=2026-08&who=a",
    );
  });

  it("주소 → 필터 → 주소가 같다", () => {
    const href = `/transactions?month=2026-08&who=joint&type=expense&cat=${ID1}&pm=${ID2}&q=%EB%8B%A4%EC%9D%B4%EC%86%8C&day=2026-08-15`;
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(filtersToHref(parseFilters(params, "2026-09"), "2026-09")).toBe(href);
  });
});

describe("sanitizeSearch", () => {
  it("필터 문법 문자를 지운다", () => {
    expect(sanitizeSearch(' 다이소,(강남)%* "점" ')).toBe("다이소 강남 점");
  });
});

describe("activeFilterCount", () => {
  it("유형·카테고리·결제수단 개수", () => {
    const f = parseFilters({ type: "income", cat: `${ID1},${ID2}`, who: "a" }, "2026-09");
    expect(activeFilterCount(f)).toBe(3);
  });
});
