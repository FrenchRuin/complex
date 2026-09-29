import { describe, expect, it } from "vitest";
import { deviceLabel, isPushable, pushPayload } from "./push";

describe("isPushable", () => {
  const now = new Date("2026-09-29T10:00:00Z");

  it("안 보냈고 2분 안에 생긴 알림만", () => {
    expect(isPushable({ createdAt: "2026-09-29T09:59:30Z", pushedAt: null }, now)).toBe(true);
    expect(isPushable({ createdAt: "2026-09-29T09:57:30Z", pushedAt: null }, now)).toBe(false);
    expect(isPushable({ createdAt: "2026-09-29T09:59:30Z", pushedAt: "2026-09-29T09:59:31Z" }, now)).toBe(false);
  });
});

describe("pushPayload", () => {
  it("앱 안 알림과 같은 문장·주소, 같은 내역은 하나로 겹치게", () => {
    const payload = pushPayload(
      {
        id: "n1",
        kind: "created",
        subject: "다이소",
        amount: 12000,
        count: 1,
        transactionId: "t1",
        noteId: null,
        eventId: null,
        occurredOn: "2026-09-29",
      },
      "서연",
    );
    expect(payload).toEqual({
      title: "감자밭",
      body: "서연님이 다이소 12,000원을 추가했어요",
      url: "/transactions?day=2026-09-29&tx=t1",
      tag: "t1",
    });
  });
});

describe("deviceLabel", () => {
  it("대략의 기기·브라우저", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1")).toBe(
      "iPhone · Safari",
    );
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36")).toBe("Android · Chrome");
  });
});
