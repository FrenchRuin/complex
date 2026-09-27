import { describe, expect, it } from "vitest";
import { parseSms } from "./parse";
import { buildSmsRows, markDuplicates } from "./rows";

const TODAY = "2026-09-27";
const ctx = {
  mySlot: "a" as const,
  methods: [
    { id: "family", owner: "joint" as const, smsAliases: ["신한"] },
    { id: "seoyeon", owner: "b" as const, smsAliases: ["삼성"] },
  ],
  categories: [
    { id: "mart", name: "생활·마트", type: "expense" as const },
    { id: "etc", name: "기타", type: "expense" as const },
    { id: "refund", name: "환불", type: "income" as const },
    { id: "etc-in", name: "기타수입", type: "income" as const },
  ],
  rules: {},
};
const parse = (text: string) => parseSms(text, TODAY)!;

describe("buildSmsRows", () => {
  it("공동 소유 카드면 공동 + 입력한 사람, 카테고리는 사전으로", () => {
    const [row] = buildSmsRows([parse("신한카드 승인 12,000원 09/27 14:35 다이소 강남점")], ctx);
    expect(row).toMatchObject({
      paymentMethodId: "family",
      cardHint: null,
      scope: "joint",
      memberSlot: "a",
      categoryId: "mart",
      selected: true,
    });
  });

  it("개인 카드면 그 사람의 개인, 추천 없으면 기타", () => {
    const [row] = buildSmsRows([parse("삼성카드 승인 9,000원 09/27 10:00 동네 꽃집")], ctx);
    expect(row).toMatchObject({ paymentMethodId: "seoyeon", scope: "personal", memberSlot: "b", categoryId: "etc" });
  });

  it("별칭이 없으면 결제수단은 비우고 카드사만 추정해서 보여준다", () => {
    const [row] = buildSmsRows([parse("현대카드 승인 5,000원 09/27 10:00 무신사")], ctx);
    expect(row).toMatchObject({ paymentMethodId: null, cardHint: "현대", scope: "personal", memberSlot: "a" });
  });

  it("취소 문자는 환불(수입)이고 기본 선택 해제", () => {
    const [row] = buildSmsRows([parse("신한카드 취소 12,000원 09/27 14:35 다이소")], ctx);
    expect(row).toMatchObject({ isCancel: true, type: "income", categoryId: "refund", selected: false });
  });
});

describe("markDuplicates", () => {
  it("중복이면 표시하고 선택 해제", () => {
    const rows = buildSmsRows(
      [parse("신한 승인 1,000원 09/27 10:00 가게"), parse("신한 승인 2,000원 09/27 11:00 가게")],
      ctx,
    );
    const marked = markDuplicates(rows, [true, false]);
    expect(marked.map((r) => [r.duplicate, r.selected])).toEqual([
      [true, false],
      [false, true],
    ]);
  });
});
