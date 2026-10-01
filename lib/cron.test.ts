import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron";

describe("isCronAuthorized", () => {
  it("Vercel Cron이 보내는 Bearer 비밀값이 맞으면 통과", () => {
    expect(isCronAuthorized("Bearer abc123", "abc123")).toBe(true);
  });
  it("값이 틀리거나 없으면 거절", () => {
    expect(isCronAuthorized("Bearer wrong", "abc123")).toBe(false);
    expect(isCronAuthorized("abc123", "abc123")).toBe(false);
    expect(isCronAuthorized(null, "abc123")).toBe(false);
  });
  it("서버에 비밀값이 등록되지 않았으면 무엇이 와도 거절 (Bearer undefined 통과 막기)", () => {
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
  });
});
