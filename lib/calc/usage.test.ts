import { describe, expect, it } from "vitest";
import { FREE_DB_LIMIT_BYTES, formatBytes, pauseNotice, usagePercent } from "./usage";

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

describe("pauseNotice", () => {
  it("하루 한 번 자동으로 깨운다고 안내 (앱을 안 열어도 괜찮다)", () => {
    expect(pauseNotice()).toBe(
      "무료 프로젝트는 7일 동안 요청이 없으면 일시 정지돼요. 하루 한 번 자동으로 깨워 둬서 앱을 안 열어도 괜찮아요.",
    );
  });
});
