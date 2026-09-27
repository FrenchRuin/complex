import { describe, expect, it } from "vitest";
import { paidShareA, settle, settlementSentence } from "./settlement";

const names = { a: "지훈", b: "서연" };

describe("settle", () => {
  it("반반: 더 낸 사람에게 차액의 절반", () => {
    // 지훈 400,000 / 서연 143,000 → (400,000 − 143,000) / 2 = 128,500
    expect(settle(400000, 143000)).toEqual({ from: "b", to: "a", amount: 128500 });
    expect(settle(10000, 30000)).toEqual({ from: "a", to: "b", amount: 10000 });
  });

  it("원 미만은 버린다", () => {
    expect(settle(10001, 0)).toEqual({ from: "b", to: "a", amount: 5000 });
  });

  it("같이 냈으면 보낼 돈 없음", () => {
    expect(settle(5000, 5000)).toBeNull();
    expect(settle(0, 0)).toBeNull();
    expect(settle(1, 0)).toBeNull();
  });

  it("비율이 다르면 그 비율로 (A 60%)", () => {
    // 합계 100,000, A 몫 60,000. A가 30,000만 냈으니 A → B 30,000
    expect(settle(30000, 70000, 60)).toEqual({ from: "a", to: "b", amount: 30000 });
  });
});

describe("paidShareA / settlementSentence", () => {
  it("결제 비율", () => {
    expect(paidShareA(400000, 143000)).toBe(74);
    expect(paidShareA(0, 0)).toBe(0);
  });

  it("문장", () => {
    expect(settlementSentence(settle(400000, 143000), names)).toBe("반반으로 나누면 서연 → 지훈 128,500원이에요");
    expect(settlementSentence(null, names)).toBe("반반으로 나누면 서로 보낼 돈이 없어요");
    expect(settlementSentence(settle(30000, 70000, 60), names, 60)).toBe("60:40로 나누면 지훈 → 서연 30,000원이에요");
  });
});
