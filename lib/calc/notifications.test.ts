import { describe, expect, it } from "vitest";
import { notificationHref, notificationSentence, notificationTimeLabel, objectParticle, toNotificationKind } from "./notifications";

const base = { subject: "다이소", amount: 12000, count: 1 };

describe("notificationSentence", () => {
  it("추가·수정·삭제·되돌리기", () => {
    expect(notificationSentence({ ...base, kind: "created" }, "서연")).toBe("서연님이 다이소 12,000원을 추가했어요");
    expect(notificationSentence({ ...base, kind: "updated" }, "서연")).toBe("서연님이 다이소 12,000원을 수정했어요");
    expect(notificationSentence({ ...base, kind: "deleted" }, "서연")).toBe("서연님이 다이소 12,000원을 삭제했어요");
    expect(notificationSentence({ ...base, kind: "restored" }, "서연")).toBe("서연님이 다이소 12,000원을 되돌렸어요");
  });

  it("정기지출 납부 체크", () => {
    expect(notificationSentence({ subject: "월세", amount: 700000, count: 1, kind: "recurring_paid" }, "지훈")).toBe(
      "지훈님이 월세 700,000원 납부를 체크했어요",
    );
  });

  it("문자 여러 건은 건수로", () => {
    expect(notificationSentence({ subject: null, amount: 50000, count: 5, kind: "sms_batch" }, "서연")).toBe(
      "서연님이 문자로 5건을 추가했어요",
    );
  });

  it("가맹점 이름이 없으면 '내역'", () => {
    expect(notificationSentence({ subject: null, amount: 3000, count: 1, kind: "created" }, "서연")).toBe(
      "서연님이 내역 3,000원을 추가했어요",
    );
  });
});

describe("메모 알림 (F-18)", () => {
  it("문장: 받침에 따라 을/를", () => {
    expect(notificationSentence({ subject: "장보기", amount: null, count: 1, kind: "note_created" }, "서연")).toBe(
      "서연님이 메모 ‘장보기’를 썼어요",
    );
    expect(notificationSentence({ subject: "여행 준비물", amount: null, count: 1, kind: "note_updated" }, "서연")).toBe(
      "서연님이 메모 ‘여행 준비물’을 고쳤어요",
    );
    expect(notificationSentence({ subject: null, amount: null, count: 1, kind: "note_deleted" }, "지훈")).toBe(
      "지훈님이 메모 ‘제목 없는 메모’를 지웠어요",
    );
  });

  it("누르면 그 메모, 지운 메모는 메모 화면", () => {
    expect(notificationHref({ kind: "note_updated", transactionId: null, occurredOn: null, noteId: "n1" })).toBe("/notes?note=n1");
    expect(notificationHref({ kind: "note_deleted", transactionId: null, occurredOn: null, noteId: "n1" })).toBe("/notes");
  });

  it("을/를", () => {
    expect(objectParticle("월세")).toBe("를");
    expect(objectParticle("장보기 목록")).toBe("을");
    expect(objectParticle("Netflix")).toBe("를");
  });
});

describe("notificationHref", () => {
  it("내역이 있으면 그 날짜 + 편집 창", () => {
    expect(notificationHref({ kind: "updated", transactionId: "t1", occurredOn: "2026-09-27" })).toBe(
      "/transactions?month=2026-09&day=2026-09-27&tx=t1",
    );
  });

  it("삭제된 내역은 날짜만", () => {
    expect(notificationHref({ kind: "deleted", transactionId: "t1", occurredOn: "2026-08-31" })).toBe(
      "/transactions?month=2026-08&day=2026-08-31",
    );
  });

  it("문자 묶음은 그 달만, 날짜가 없으면 내역 화면", () => {
    expect(notificationHref({ kind: "sms_batch", transactionId: null, occurredOn: "2026-09-02" })).toBe(
      "/transactions?month=2026-09",
    );
    expect(notificationHref({ kind: "created", transactionId: "t1", occurredOn: null })).toBe("/transactions");
  });
});

describe("notificationTimeLabel", () => {
  const now = new Date("2026-09-28T06:00:00Z"); // 한국 시간 9월 28일 15:00

  it("오늘·어제는 시각까지 (한국 시간)", () => {
    expect(notificationTimeLabel("2026-09-28T05:05:00Z", now)).toBe("오늘 14:05");
    expect(notificationTimeLabel("2026-09-27T12:10:00Z", now)).toBe("어제 21:10");
  });

  it("한국 시간 자정을 넘기면 다음 날로 본다", () => {
    expect(notificationTimeLabel("2026-09-27T15:30:00Z", now)).toBe("오늘 00:30");
  });

  it("그보다 전이면 날짜만", () => {
    expect(notificationTimeLabel("2026-09-25T01:00:00Z", now)).toBe("3일 전");
    expect(notificationTimeLabel("2026-09-02T01:00:00Z", now)).toBe("9월 2일");
  });
});

describe("toNotificationKind", () => {
  it("모르는 값은 수정으로", () => {
    expect(toNotificationKind("sms_batch")).toBe("sms_batch");
    expect(toNotificationKind("???")).toBe("updated");
  });
});
