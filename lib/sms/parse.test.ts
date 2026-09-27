import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSms, parseSmsText, splitMessages, type ParsedSms } from "./parse";

const TODAY = "2026-09-27";
const fixture = (name: string) =>
  readFileSync(path.resolve(import.meta.dirname, "../../fixtures/sms", name), "utf8");

type Expected = Omit<ParsedSms, "raw">;

/** fixtures/sms 파일별 기대값 (가상 예시, 실제 문자는 받는 대로 추가) */
const CASES: Record<string, Expected> = {
  "shinhan-approve-oneline.txt": {
    amount: 12000, date: "2026-09-27", time: "14:35", type: "expense", isCancel: false,
    merchant: "다이소 강남점", cardHint: "신한",
  },
  "samsung-approve.txt": {
    amount: 45000, date: "2026-09-26", time: "19:20", type: "expense", isCancel: false,
    merchant: "이마트 성수점", cardHint: "삼성",
  },
  "kb-approve.txt": {
    amount: 4500, date: "2026-09-25", time: "08:12", type: "expense", isCancel: false,
    merchant: "스타벅스강남대로점", cardHint: "KB국민",
  },
  "hyundai-approve.txt": {
    amount: 23000, date: "2026-09-24", time: "12:01", type: "expense", isCancel: false,
    merchant: "무신사", cardHint: "현대",
  },
  "lotte-approve-oneline.txt": {
    amount: 8900, date: "2026-09-23", time: "21:44", type: "expense", isCancel: false,
    merchant: "배달의민족", cardHint: "롯데",
  },
  "hana-cancel.txt": {
    amount: 12000, date: "2026-09-22", time: "10:30", type: "expense", isCancel: true,
    merchant: "쿠팡", cardHint: "하나",
  },
  "nh-deposit.txt": {
    amount: 3200000, date: "2026-09-25", time: "09:00", type: "income", isCancel: false,
    merchant: "(주)회사급여", cardHint: "NH농협",
  },
  "kakaobank-withdraw.txt": {
    amount: 55000, date: "2026-09-20", time: "18:30", type: "expense", isCancel: false,
    merchant: "SKT통신요금", cardHint: "카카오뱅크",
  },
  "toss-korean-date.txt": {
    amount: 16000, date: "2026-09-19", time: "13:05", type: "expense", isCancel: false,
    merchant: "CGV용산", cardHint: "토스",
  },
  "woori-installment.txt": {
    amount: 1200000, date: "2026-09-18", time: "15:22", type: "expense", isCancel: false,
    merchant: "LG전자베스트샵", cardHint: "우리",
  },
};

describe("fixtures/sms 예시 문자 인식", () => {
  for (const [file, expected] of Object.entries(CASES)) {
    it(file, () => {
      const [message] = splitMessages(fixture(file));
      expect(parseSms(message, TODAY)).toEqual({ ...expected, raw: message });
    });
  }
});

describe("splitMessages", () => {
  it("빈 줄과 [Web발신]으로 나누고 금액 없는 조각은 버린다", () => {
    const text = [fixture("samsung-approve.txt"), "안녕하세요 광고 문자예요", fixture("kb-approve.txt")].join("\n\n");
    expect(splitMessages(text)).toHaveLength(2);
    expect(parseSmsText(`${fixture("hana-cancel.txt")}${fixture("hyundai-approve.txt")}`, TODAY)).toHaveLength(2);
  });
});

describe("parseSms 세부 규칙", () => {
  it("누적·잔액·한도 금액은 건너뛴다", () => {
    expect(parseSms("잔액 500,000원 한도 1,000,000원 승인 7,000원 09/27 10:00 편의점", TODAY)?.amount).toBe(7000);
  });

  it("이번 달보다 2개월 이상 뒤의 월은 작년", () => {
    expect(parseSms("승인 5,000원 12/30 10:00 가게", "2027-01-05")?.date).toBe("2026-12-30");
    expect(parseSms("승인 5,000원 10/01 10:00 가게", TODAY)?.date).toBe("2026-10-01");
  });

  it("날짜가 없거나 없는 날짜면 오늘", () => {
    expect(parseSms("승인 5,000원 가게", TODAY)?.date).toBe(TODAY);
    expect(parseSms("승인 5,000원 02/30 10:00 가게", TODAY)?.date).toBe(TODAY);
  });

  it("입금과 출금이 같이 있으면 지출", () => {
    expect(parseSms("입금 출금 10,000원 09/27 10:00 이체", TODAY)?.type).toBe("expense");
  });

  it("금액이 없으면 null", () => {
    expect(parseSms("오늘 날씨가 좋아요", TODAY)).toBeNull();
  });

  it("가맹점 '하나로마트'는 카드사 줄로 보지 않는다", () => {
    expect(parseSms("신한카드 승인\n김*수\n9,900원 일시불\n09/27 18:00\n하나로마트", TODAY)?.merchant).toBe("하나로마트");
  });
});
