import { describe, expect, it } from "vitest";
import { activeFilterCount, filtersToHref, isSearchAll, parseFilters, sanitizeSearch } from "./filters";

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
      amount: null,
      thisMonthOnly: false,
      limit: 100,
      day: null,
    });
  });

  it("검색어가 있으면 전체 기간, period=month면 이번 달만", () => {
    expect(isSearchAll(parseFilters({ q: "스타벅스" }, "2026-09"))).toBe(true);
    expect(isSearchAll(parseFilters({ q: "스타벅스", period: "month" }, "2026-09"))).toBe(false);
    expect(isSearchAll(parseFilters({}, "2026-09"))).toBe(false);
  });

  it("숫자로만 된 검색어는 금액으로도 찾는다", () => {
    expect(parseFilters({ q: "12,000" }, "2026-09")).toMatchObject({ q: "12000", amount: 12000 });
    expect(parseFilters({ q: "12000원" }, "2026-09")).toMatchObject({ amount: 12000 });
    expect(parseFilters({ q: "GS25" }, "2026-09")).toMatchObject({ q: "GS25", amount: null });
    expect(parseFilters({ q: "0" }, "2026-09").amount).toBeNull();
  });

  it("더 보기 개수는 100 단위, 최대 2000", () => {
    expect(parseFilters({ q: "a", limit: "200" }, "2026-09").limit).toBe(200);
    expect(parseFilters({ q: "a", limit: "99999" }, "2026-09").limit).toBe(2000);
    expect(parseFilters({ q: "a", limit: "abc" }, "2026-09").limit).toBe(100);
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

  it("month 없이 day나 at만 오면 그 날짜가 든 달 (알림 주소, F-56)", () => {
    // 월급날 25일·끝나는 달 이름: 9/28은 "10월"
    const payPeriod = (date: string) => (date >= "2026-09-25" && date <= "2026-10-24" ? "2026-10" : date.slice(0, 7));
    expect(parseFilters({ day: "2026-09-28" }, "2026-10", payPeriod)).toMatchObject({ month: "2026-10", day: "2026-09-28" });
    expect(parseFilters({ at: "2026-09-28" }, "2026-11", payPeriod)).toMatchObject({ month: "2026-10", day: null });
    expect(parseFilters({ day: "2026-08-15" }, "2026-09")).toMatchObject({ month: "2026-08", day: "2026-08-15" });
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

  it("검색 옵션(이번 달만, 더 보기)도 주소에 남는다", () => {
    const f = parseFilters({ q: "커피" }, "2026-09");
    expect(filtersToHref(f, "2026-09", { thisMonthOnly: true })).toBe(
      "/transactions?q=%EC%BB%A4%ED%94%BC&period=month",
    );
    expect(filtersToHref(f, "2026-09", { limit: 200 })).toBe("/transactions?q=%EC%BB%A4%ED%94%BC&limit=200");
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
