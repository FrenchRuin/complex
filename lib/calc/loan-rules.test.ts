import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, isRuleStale, parseRules, RULE_FIELDS, RULE_GROUPS, ruleSchemas, ruleValueSummary } from "./loan-rules";

describe("DEFAULT_RULES", () => {
  it("모든 묶음이 자기 스키마를 통과한다", () => {
    for (const group of RULE_GROUPS) expect(ruleSchemas[group].safeParse(DEFAULT_RULES[group]).success).toBe(true);
  });
  it("입력 칸 목록이 기본값의 키와 맞다 (확인한 날·출처 빼고)", () => {
    for (const group of RULE_GROUPS) {
      const keys = Object.keys(DEFAULT_RULES[group]).filter((k) => k !== "checkedOn" && k !== "source");
      expect(RULE_FIELDS[group].map((f) => f.key).sort()).toEqual(keys.sort());
    }
  });
});

describe("parseRules", () => {
  it("비었거나 객체가 아니면 기본값", () => {
    expect(parseRules({})).toEqual(DEFAULT_RULES);
    expect(parseRules(null)).toEqual(DEFAULT_RULES);
    expect(parseRules("x")).toEqual(DEFAULT_RULES);
  });
  it("고친 묶음은 그 값을 쓰고, 잘못된 묶음만 기본값", () => {
    const rules = parseRules({ stress: { ...DEFAULT_RULES.stress, metroBp: 150 }, bankBuy: { ltvRegulated: "x" } });
    expect(rules.stress.metroBp).toBe(150);
    expect(rules.bankBuy).toEqual(DEFAULT_RULES.bankBuy);
    expect(rules.didimdol).toEqual(DEFAULT_RULES.didimdol);
  });
});

describe("isRuleStale", () => {
  it("오늘보다 6개월 넘게 지났으면 오래된 기준", () => {
    expect(isRuleStale("2026-03-29", "2026-09-30")).toBe(true);
    expect(isRuleStale("2026-03-30", "2026-09-30")).toBe(false);
    expect(isRuleStale("2026-04-01", "2026-09-30")).toBe(false);
  });
  it("해가 바뀌어도 맞게 센다", () => {
    expect(isRuleStale("2025-08-27", "2026-02-28")).toBe(true);
    expect(isRuleStale("2025-08-31", "2026-02-28")).toBe(false);
  });
});

describe("ruleValueSummary", () => {
  it("묶음마다 값을 한 줄로", () => {
    expect(ruleValueSummary("bankBuy", DEFAULT_RULES)).toBe(
      "LTV 규제 40% · 비규제 70% · 생애최초 70%/80%, 상한 6억 원/4억 원/2억 원, DSR 40%, 최대 30년",
    );
    expect(ruleValueSummary("stress", DEFAULT_RULES)).toBe("수도권·규제 +3%, 지방 +0.75%, 신용대출 5년");
    expect(ruleValueSummary("bankJeonse", DEFAULT_RULES)).toBe("보증금의 80%, 한도 5억 원");
    expect(ruleValueSummary("defaults", DEFAULT_RULES)).toBe("매매 4%, 전세 3.8%, 만기 30년");
  });
});
