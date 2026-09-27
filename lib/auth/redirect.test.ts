import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("사이트 안 경로는 허용한다", () => {
    expect(safeNextPath("/invite/abc123")).toBe("/invite/abc123");
    expect(safeNextPath("/settings?tab=1")).toBe("/settings?tab=1");
  });

  it("다른 사이트로 가는 값은 막는다", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("evil.com")).toBeNull();
  });

  it("제어 문자와 로그인 화면 자신은 막는다", () => {
    expect(safeNextPath("/a\nb")).toBeNull();
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/login?next=/x")).toBeNull();
  });

  it("문자열이 아니면 null", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
