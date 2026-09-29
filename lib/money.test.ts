import { describe, expect, it } from "vitest";
import { formatNumber, formatWon, formatWonShort, formatWonTiny, parseWon } from "./money";

describe("formatWon", () => {
  it("쉼표와 원을 붙인다", () => {
    expect(formatWon(0)).toBe("0원");
    expect(formatWon(12000)).toBe("12,000원");
    expect(formatWon(1284300)).toBe("1,284,300원");
  });
});

describe("formatNumber", () => {
  it("쉼표만 붙인다", () => {
    expect(formatNumber(3500000)).toBe("3,500,000");
  });
});

describe("formatWonShort", () => {
  it("1만 미만은 쉼표로 쓴다", () => {
    expect(formatWonShort(8500)).toBe("8,500");
    expect(formatWonShort(9999)).toBe("9,999");
  });

  it("1만 이상은 만 단위 소수 첫째 자리로 쓴다", () => {
    expect(formatWonShort(10000)).toBe("1만");
    expect(formatWonShort(87000)).toBe("8.7만");
    expect(formatWonShort(100000)).toBe("10만");
    expect(formatWonShort(3100000)).toBe("310만");
  });

  it("소수 둘째 자리에서 반올림한다", () => {
    expect(formatWonShort(87450)).toBe("8.7만");
    expect(formatWonShort(87550)).toBe("8.8만");
    expect(formatWonShort(99960)).toBe("10만");
  });

  it("큰 금액은 쉼표를 붙인다", () => {
    expect(formatWonShort(123456789)).toBe("12,345.7만");
  });
});

describe("formatWonTiny", () => {
  it("100만 미만은 formatWonShort와 같다", () => {
    expect(formatWonTiny(8050)).toBe("8,050");
    expect(formatWonTiny(265000)).toBe("26.5만");
    expect(formatWonTiny(999999)).toBe("100만");
  });

  it("100만 이상은 소수·쉼표 없이 만 단위", () => {
    expect(formatWonTiny(1716000)).toBe("172만");
    expect(formatWonTiny(8078000)).toBe("808만");
    expect(formatWonTiny(12345678)).toBe("1235만");
  });

  it("1억 이상(반올림해서 1억 포함)은 억 단위 소수 첫째 자리", () => {
    expect(formatWonTiny(123456789)).toBe("1.2억");
    expect(formatWonTiny(99995000)).toBe("1억");
    expect(formatWonTiny(250000000)).toBe("2.5억");
  });

  it("음수도 부호를 붙인다", () => {
    expect(formatWonTiny(-1716000)).toBe("-172만");
  });
});

describe("parseWon", () => {
  it("숫자만 골라 정수로 바꾼다", () => {
    expect(parseWon("12,000원")).toBe(12000);
    expect(parseWon(" 3 500 ")).toBe(3500);
    expect(parseWon("0")).toBe(0);
  });

  it("숫자가 없으면 null", () => {
    expect(parseWon("")).toBeNull();
    expect(parseWon("원")).toBeNull();
  });

  it("너무 큰 수는 null", () => {
    expect(parseWon("99999999999999999999")).toBeNull();
  });
});
