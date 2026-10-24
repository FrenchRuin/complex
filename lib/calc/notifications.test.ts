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
    expect(notificationSentence({ subject: "월세", amount: 700000, count: 1, kind: "recurring_unchecked" }, "지훈")).toBe(
      "지훈님이 월세 700,000원 납부 체크를 풀었어요",
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

describe("notificationHref", () => {
  it("내역이 있으면 그 날짜 + 편집 창", () => {
    expect(notificationHref({ kind: "updated", transactionId: "t1", occurredOn: "2026-09-27" })).toBe(
      "/transactions?day=2026-09-27&tx=t1",
    );
  });

  it("삭제된 내역은 날짜만", () => {
    expect(notificationHref({ kind: "deleted", transactionId: "t1", occurredOn: "2026-08-31" })).toBe(
      "/transactions?day=2026-08-31",
    );
    expect(notificationHref({ kind: "recurring_unchecked", transactionId: "t1", occurredOn: "2026-08-31" })).toBe(
      "/transactions?day=2026-08-31",
    );
  });

  it("문자 묶음은 그 날짜가 든 달만(at), 날짜가 없으면 내역 화면", () => {
    expect(notificationHref({ kind: "sms_batch", transactionId: null, occurredOn: "2026-09-02" })).toBe(
      "/transactions?at=2026-09-02",
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
  it("아는 종류는 그대로, 지운 기능의 종류(메모·일정)와 모르는 값은 null", () => {
    expect(toNotificationKind("created")).toBe("created");
    expect(toNotificationKind("mood_set")).toBe("mood_set");
    expect(toNotificationKind("note_created")).toBeNull();
    expect(toNotificationKind("event_updated")).toBeNull();
    expect(toNotificationKind("???")).toBeNull();
  });
});

describe("기분 알림 (F-04)", () => {
  it("문장과 갈 곳", () => {
    const mood = { kind: "mood_set" as const, subject: "야근 중", amount: null, count: 1, mood: "tired" };
    expect(notificationSentence(mood, "서연")).toBe("서연님이 오늘 기분을 😴 피곤해요로 정했어요 · 야근 중");
    expect(notificationSentence({ ...mood, subject: null, mood: "happy" }, "서연")).toBe(
      "서연님이 오늘 기분을 🥰 행복해요로 정했어요",
    );
    expect(notificationHref({ kind: "mood_set", transactionId: null, occurredOn: "2026-10-01" })).toBe("/");
    expect(toNotificationKind("mood_set")).toBe("mood_set");
  });
});

describe("objectParticle", () => {
  it("받침이 있으면 을, 없거나 한글이 아니면 를", () => {
    expect(objectParticle("운동")).toBe("을");
    expect(objectParticle("치과")).toBe("를");
    expect(objectParticle("ABC")).toBe("를");
  });
});
