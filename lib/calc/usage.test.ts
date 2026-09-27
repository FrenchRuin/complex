import { describe, expect, it } from "vitest";
import { FREE_DB_LIMIT_BYTES, daysSince, formatBytes, pauseNotice, usagePercent } from "./usage";

describe("formatBytes", () => {
  it("단위를 붙인다", () => {
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(1536)).toBe("1.5KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10MB");
    expect(formatBytes(3.24 * 1024 * 1024)).toBe("3.2MB");
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2GB");
  });
});

describe("usagePercent", () => {
  it("한도 대비 %", () => {
    expect(usagePercent(250 * 1024 * 1024, FREE_DB_LIMIT_BYTES)).toBe(50);
    expect(usagePercent(0, FREE_DB_LIMIT_BYTES)).toBe(0);
  });

  it("아주 적게 써도 0이 아니면 1%, 넘으면 100%", () => {
    expect(usagePercent(1024, FREE_DB_LIMIT_BYTES)).toBe(1);
    expect(usagePercent(FREE_DB_LIMIT_BYTES * 2, FREE_DB_LIMIT_BYTES)).toBe(100);
  });
});

describe("daysSince / pauseNotice", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  it("지난 날 수", () => {
    expect(daysSince("2026-09-27T01:00:00Z", now)).toBe(0);
    expect(daysSince("2026-09-24T11:00:00Z", now)).toBe(3);
  });

  it("오래 안 썼으면 앱을 열라고 안내", () => {
    expect(pauseNotice("2026-09-21T11:00:00Z", now)).toContain("6일 전");
    expect(pauseNotice("2026-09-26T11:00:00Z", now)).toContain("열기만 해도 괜찮아요");
    expect(pauseNotice(null, now)).toContain("7일 동안");
  });
});
